"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import MenuBtn from "@/src/components/menu-btn";
import { Chess, type Square } from "chess.js";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false },
);

interface WsMessage {
  type:
    | "move"
    | "init"
    | "status"
    | "room_created"
    | "room_joined"
    | "opponent_joined"
    | "room_not_found";
  fen?: string;
  san?: string;
  from?: string;
  to?: string;
  color?: "w" | "b";
  roomId?: string;
}

export default function GamePage() {
  const gameRef = useRef<Chess>(new Chess());
  const [gameFen, setGameFen] = useState(gameRef.current.fen());
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null,
  );
  const [myColor, setMyColor] = useState<"w" | "b" | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);

  // Состояния WebSocket и комнат
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "error"
  >("connecting");
  const [lobbyRoomId, setLobbyRoomId] = useState<string>("");
  const [currentRoomId, setCurrentRoomId] = useState<string>("");

  // Управление экранами (Лобби -> Ожидание соперника -> Игра)
  const [isLobbyVisible, setIsLobbyVisible] = useState(true);
  const [isWaiting, setIsWaiting] = useState(false);
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [lobbyError, setLobbyError] = useState<string | null>(null);

  // UI состояния игры
  const [moveInput, setMoveInput] = useState("");
  const [notice, setNotice] = useState("");
  const [piecesVisible, setPiecesVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  const refreshGame = useCallback(() => {
    const game = gameRef.current;
    setGameFen(game.fen());
    setMoveHistory(game.history());
    if (game.isGameOver()) {
      setIsEndModalOpen(true);
    }
  }, []);

  const sendMove = useCallback(
    (from: Square, to: Square, san: string) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const payload = {
        type: "move",
        fen: gameRef.current.fen(),
        from,
        to,
        san,
      };
      ws.send(JSON.stringify(payload));
    },
    [ws],
  );

  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      const game = gameRef.current;
      if (game.isGameOver() || !isMyTurn) return false;
      try {
        const move = game.move({ from, to, promotion: "q" });
        if (!move) return false;
        setLastMove({ from: move.from, to: move.to });
        setNotice(`Последний ход: ${move.san}`);
        refreshGame();
        sendMove(move.from, move.to, move.san);
        setIsMyTurn(false);
        return true;
      } catch {
        return false;
      }
    },
    [refreshGame, isMyTurn, sendMove],
  );

  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (!targetSquare || !isMyTurn) return false;
      return makeMove(sourceSquare as Square, targetSquare as Square);
    },
    [isMyTurn, makeMove],
  );

  const submitMove = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value || !isMyTurn) return;
      const game = gameRef.current;
      if (game.isGameOver()) {
        setNotice("Партия завершена.");
        setIsEndModalOpen(true);
        return;
      }
      try {
        let move;
        const coordinate = value.match(
          /^([a-h][1-8])\s*[-x]?\s*([a-h][1-8])(?:=?([qrbn]))?$/i,
        );
        if (coordinate) {
          move = game.move({
            from: coordinate[1].toLowerCase() as Square,
            to: coordinate[2].toLowerCase() as Square,
            promotion: (coordinate[3]?.toLowerCase() || "q") as
              | "q"
              | "r"
              | "b"
              | "n",
          });
        } else {
          move = game.move(value);
        }
        if (!move) throw new Error();
        setLastMove({ from: move.from, to: move.to });
        setMoveInput("");
        setNotice(`Ход принят: ${move.san}`);
        refreshGame();
        sendMove(move.from, move.to, move.san);
        setIsMyTurn(false);
      } catch {
        setNotice("Некорректный ход. Пример: e4, Nf3 или e2e4.");
      }
    },
    [isMyTurn, refreshGame, sendMove],
  );

  const setupSocket = (roomId: string, host: boolean) => {
    const socket = new WebSocket(`wss://your-backend.com/ws?room=${roomId}`);
    setWs(socket);
    setConnectionStatus("connecting");
    setCurrentRoomId(roomId);

    socket.onopen = () => {
      setConnectionStatus("connected");
      if (host) {
        setMyColor("w");
        setIsMyTurn(true); // Создатель ходит первым (белые)
      }
    };

    socket.onmessage = (event) => {
      const data: WsMessage = JSON.parse(event.data);

      // Бэкенд подтвердил создание комнаты -> переходим в режим ожидания второго игрока
      if (data.type === "room_created") {
        setIsWaiting(true);
      }

      // Соперник подключился к созданной комнате (событие приходит хосту)
      if (data.type === "opponent_joined") {
        setIsWaiting(false);
        setIsLobbyVisible(false);
        setIsGameStarted(true);
        setNotice("Соперник подключен! Игра началась.");
      }

      // Гость успешно присоединился к комнате -> сразу переходим к игре
      if (data.type === "room_joined") {
        setIsLobbyVisible(false);
        setIsWaiting(false);
        setIsGameStarted(true);
        setMyColor(data.color || "b");
        setIsMyTurn(data.color === "w"); // Если сервер назначил белые — ход первый
        setNotice("Вы подключились к игре.");
      }

      if (data.type === "room_not_found") {
        setLobbyError("Комната не найдена или уже занята");
        setConnectionStatus("error");
        setIsWaiting(false);
      }

      // Получен ход от соперника
      if (data.type === "move" && data.fen) {
        gameRef.current.load(data.fen);
        setLastMove({ from: data.from as Square, to: data.to as Square });
        setIsMyTurn(true);
        refreshGame();
      }
    };

    socket.onclose = () => {
      setConnectionStatus("error");
    };
    socket.onerror = () => {
      setConnectionStatus("error");
    };

    return () => socket.close();
  };

  const createRoom = () => {
    const newId = Math.random().toString(36).substring(2, 8).toUpperCase();
    setLobbyRoomId(newId);
    setLobbyError(null);
    setupSocket(newId, true);
  };

  const joinRoom = () => {
    if (!lobbyRoomId.trim()) return;
    setLobbyError(null);
    setupSocket(lobbyRoomId.toUpperCase(), false);
  };

  useEffect(() => {
    return () => {
      if (ws) ws.close();
    };
  }, [ws]);

  return (
    <div className="bcm-app-container">
      {/* Боковая панель */}
      <aside className="menu-left">
        <div className="menu-wrapper">
          <div className="menu-top">
            <div className="menu-after">
              <p className="project-name">Blind chess master</p>
              <div className="accaunt">
                <p className="account-title">Аккаунт</p>
                <div className="logo">
                  <Image
                    src="/user-icon.png"
                    width={90}
                    height={90}
                    alt="User Icon"
                  />
                  <div className="info-group">
                    <p>User123</p>
                    <p>1600 elo</p>
                  </div>
                </div>
              </div>
            </div>
            <hr />
            <div className="menu-before">
              <MenuBtn />
            </div>
          </div>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="bcm-main-content">
        {/* ЭКРАН ЛОББИ / ОЖИДАНИЯ СОПЕРНИКА */}
        {isLobbyVisible && (
          <div className="bcm-lobby-card">
            {!isWaiting ? (
              <>
                <h2 className="bcm-lobby-title">Сетевая игра</h2>
                <p className="bcm-lobby-subtitle">
                  Создайте комнату или подключитесь по коду друга
                </p>

                {lobbyError && <p className="bcm-lobby-error">{lobbyError}</p>}

                <div className="bcm-lobby-input-group">
                  <input
                    type="text"
                    value={lobbyRoomId}
                    onChange={(e) =>
                      setLobbyRoomId(e.target.value.toUpperCase())
                    }
                    placeholder="Введите ID комнаты"
                    className="bcm-lobby-input"
                    autoComplete="off"
                  />
                </div>

                <div className="bcm-lobby-actions">
                  <button className="bcm-btn-action" onClick={createRoom}>
                    Создать комнату
                  </button>
                  <button
                    className="bcm-btn-action bcm-btn-primary"
                    onClick={joinRoom}
                    disabled={!lobbyRoomId.trim()}
                  >
                    Присоединиться
                  </button>
                </div>
              </>
            ) : (
              /* Экран ожидания подключения второго игрока */
              <div className="bcm-waiting-screen">
                <div className="bcm-spinner"></div>
                <h2 className="bcm-lobby-title">Ожидание соперника...</h2>
                <p className="bcm-lobby-subtitle">
                  Передайте код комнаты второму игроку:
                </p>
                <div className="bcm-room-code-badge">{currentRoomId}</div>
                <button
                  className="bcm-btn-action"
                  onClick={() => {
                    setIsWaiting(false);
                    if (ws) ws.close();
                  }}
                  style={{ marginTop: "20px" }}
                >
                  Отменить
                </button>
              </div>
            )}
          </div>
        )}

        {/* ЭКРАН ИГРЫ (отображается после подключения двоих) */}
        {isGameStarted && (
          <>
            {/* Левая колонка: Ходы и Форма ввода */}
            <section className="bcm-moves-column">
              <div className="bcm-moves-card">
                <h2 className="bcm-moves-heading">Сделанные Ходы</h2>
                <div className="bcm-moves-list-container">
                  {moveHistory.length === 0 ? (
                    <p className="bcm-empty-history">Ходы появятся здесь</p>
                  ) : (
                    <div className="bcm-moves-list">
                      {Array.from(
                        { length: Math.ceil(moveHistory.length / 2) },
                        (_, i) => (
                          <div className="bcm-move-row" key={i}>
                            <span className="bcm-move-num">{i + 1}.</span>
                            <span className="bcm-move-white">
                              {moveHistory[i * 2] || ""}
                            </span>
                            <span className="bcm-move-black">
                              {moveHistory[i * 2 + 1] || ""}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </div>
              </div>

              <form
                className="bcm-input-card"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMove(moveInput);
                }}
              >
                <textarea
                  id="move-input"
                  className="bcm-move-textarea"
                  value={moveInput}
                  onChange={(e) => setMoveInput(e.target.value)}
                  placeholder="Введите свой следующий ход например (Nf3, e.g)"
                  autoComplete="off"
                  rows={3}
                />
                {notice && <p className="bcm-notice">{notice}</p>}
                <div className="bcm-input-footer">
                  <button
                    type="submit"
                    className="bcm-submit-btn"
                    disabled={!moveInput.trim() || !isMyTurn}
                  >
                    Сходить
                  </button>
                </div>
              </form>
            </section>

            {/* Правая колонка: Доска и Инфо-блок */}
            <section className="bcm-board-column">
              <div className="bcm-board-card">
                <div className="bcm-board-frame">
                  <div className="bcm-files top-files">
                    {"abcdefgh".split("").map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                  <div className="bcm-board-with-ranks">
                    <div className="bcm-ranks">
                      {"87654321".split("").map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                    </div>
                    <div
                      className={`bcm-board-wrapper ${piecesVisible ? "pieces-visible" : "blind-mode"}`}
                    >
                      <Chessboard
                        options={{
                          position: gameFen,
                          onPieceDrop: onDrop,
                          allowDragging: isMyTurn,
                          animationDurationInMs: 150,
                          boardStyle: {
                            width: "100%",
                            borderRadius: 0,
                            overflow: "hidden",
                          },
                          darkSquareStyle: { backgroundColor: "#403C53" },
                          lightSquareStyle: { backgroundColor: "#FFFFFF" },
                        }}
                      />
                      {!piecesVisible && (
                        <div className="bcm-blind-overlay" aria-hidden="true" />
                      )}
                    </div>
                  </div>
                  <div className="bcm-files bottom-files">
                    {"abcdefgh".split("").map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Блок информации об игре внизу справа */}
              <section className="bcm-game-info">
                <h2 className="bcm-game-info-heading">Информация о игре</h2>
                <div className="bcm-list-item">
                  <span>Статус игры</span>
                  <span className="bcm-button-status">
                    {isMyTurn ? "Ваш ход" : "Ход соперника"}
                  </span>
                </div>
                <div className="bcm-list-item">
                  <span>
                    Комната: <strong>{currentRoomId}</strong> | Цвет:{" "}
                    <strong>{myColor === "w" ? "Белые" : "Черные"}</strong>
                  </span>
                  <span>Время игры: 3:24</span>
                </div>
                <div className="bcm-list-item last-move-info">
                  <span>
                    Последний ход:{" "}
                    {moveHistory.length
                      ? moveHistory[moveHistory.length - 1]
                      : "—"}
                  </span>
                  <label className="bcm-pieces-toggle">
                    <input
                      type="checkbox"
                      checked={piecesVisible}
                      onChange={(e) => setPiecesVisible(e.target.checked)}
                    />
                    С фигурами
                  </label>
                </div>
              </section>
            </section>
          </>
        )}
      </main>

      {/* Модальное окно настроек / помощи */}
      {(isSettingsOpen || isHelpOpen || isEndModalOpen) && (
        <div
          className="bcm-modal-overlay"
          onClick={() => {
            setIsSettingsOpen(false);
            setIsHelpOpen(false);
            setIsEndModalOpen(false);
          }}
        >
          <section
            className="bcm-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="bcm-modal-close"
              onClick={() => {
                setIsSettingsOpen(false);
                setIsHelpOpen(false);
                setIsEndModalOpen(false);
              }}
            >
              ×
            </button>
            <h2 className="bcm-modal-title">
              {isEndModalOpen
                ? "Игра завершена"
                : isSettingsOpen
                  ? "Настройки"
                  : "Помощь"}
            </h2>
            {isEndModalOpen ? (
              <p>Партия завершена.</p>
            ) : isSettingsOpen ? (
              <label className="bcm-setting-item">
                Показывать фигуры
                <input
                  type="checkbox"
                  checked={piecesVisible}
                  onChange={(e) => setPiecesVisible(e.target.checked)}
                />
              </label>
            ) : (
              <p>
                Играйте вслепую по сети. Вводите ход в формате SAN (например,
                e4, Nf3) или координатами (e2e4).
              </p>
            )}
            <button
              className="bcm-btn-action bcm-btn-primary"
              onClick={() => {
                setIsSettingsOpen(false);
                setIsHelpOpen(false);
                setIsEndModalOpen(false);
              }}
            >
              Понятно
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
