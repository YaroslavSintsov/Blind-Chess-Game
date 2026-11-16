"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Chess, type Square } from "chess.js";
import MenuBtn from "@/src/components/menu-btn";

const Chessboard = dynamic(
  () => import("react-chessboard").then((mod) => mod.Chessboard),
  { ssr: false },
);

type GameMode = "ai" | "pvp";

export default function GamePage() {
  const gameRef = useRef<Chess>(new Chess());
  const [gameFen, setGameFen] = useState(gameRef.current.fen());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [optionSquares, setOptionSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [gameMode, setGameMode] = useState<GameMode>("ai");
  const [isThinking, setIsThinking] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState("Игра идет");
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
    if (game.isCheckmate()) {
      setGameStatus(
        `Мат! Победили ${game.turn() === "w" ? "черные" : "белые"}`,
      );
    } else if (game.isStalemate()) {
      setGameStatus("Пат — ничья");
    } else if (game.isDraw()) {
      setGameStatus("Ничья");
    } else if (game.isCheck()) {
      setGameStatus(`Шах! Ход ${game.turn() === "w" ? "белых" : "черных"}`);
    } else {
      setGameStatus("Игра идет");
    }
    if (game.isGameOver()) setIsEndModalOpen(true);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setOptionSquares({});
  }, []);

  const makeMove = useCallback(
    (from: Square, to: Square): boolean => {
      const game = gameRef.current;
      if (game.isGameOver()) return false;
      try {
        const move = game.move({ from, to, promotion: "q" });
        if (!move) return false;
        setNotice(`Последний ход: ${move.san}`);
        clearSelection();
        refreshGame();
        return true;
      } catch {
        return false;
      }
    },
    [clearSelection, refreshGame],
  );

  const showLegalMoves = useCallback(
    (square: Square) => {
      const game = gameRef.current;
      const piece = game.get(square);
      if (!piece || piece.color !== game.turn()) {
        clearSelection();
        return;
      }
      const styles: Record<string, React.CSSProperties> = {
        [square]: { backgroundColor: "rgba(255, 255, 0, .45)" },
      };
      game.moves({ square, verbose: true }).forEach((move) => {
        styles[move.to] = {
          background:
            "radial-gradient(circle, rgba(0,255,80,.65) 0 16%, transparent 17%)",
        };
      });
      setSelectedSquare(square);
      setOptionSquares(styles);
    },
    [clearSelection],
  );

  const onSquareClick = useCallback(
    ({ square }: { piece: unknown; square: string }) => {
      if (isThinking) return;
      const target = square as Square;
      const game = gameRef.current;
      if (gameMode === "ai" && game.turn() !== "w") return;
      if (selectedSquare && makeMove(selectedSquare, target)) return;
      const piece = game.get(target);
      if (piece && piece.color === game.turn()) showLegalMoves(target);
      else clearSelection();
    },
    [
      clearSelection,
      gameMode,
      isThinking,
      makeMove,
      selectedSquare,
      showLegalMoves,
    ],
  );

  const onDrop = useCallback(
    ({
      sourceSquare,
      targetSquare,
    }: {
      piece: unknown;
      sourceSquare: string;
      targetSquare: string | null;
    }) => {
      if (isThinking || !targetSquare) return false;
      if (gameMode === "ai" && gameRef.current.turn() !== "w") return false;
      return makeMove(sourceSquare as Square, targetSquare as Square);
    },
    [gameMode, isThinking, makeMove],
  );

  const submitMove = useCallback(
    (raw: string) => {
      const value = raw.trim();
      if (!value) return;
      const game = gameRef.current;
      if (game.isGameOver()) {
        setNotice("Партия завершена. Начните новую игру.");
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
        setMoveInput("");
        setNotice(`Ход принят: ${move.san}`);
        clearSelection();
        refreshGame();
      } catch {
        setNotice("Некорректный ход. Пример: e4, Nf3 или e2e4.");
      }
    },
    [clearSelection, refreshGame],
  );

  const resetGame = useCallback(() => {
    gameRef.current.reset();
    setMoveInput("");
    setNotice("");
    setIsThinking(false);
    setIsEndModalOpen(false);
    clearSelection();
    refreshGame();
  }, [clearSelection, refreshGame]);

  useEffect(() => {
    if (
      gameMode !== "ai" ||
      gameRef.current.turn() !== "b" ||
      gameRef.current.isGameOver()
    )
      return;
    setIsThinking(true);
    const timer = window.setTimeout(() => {
      const game = gameRef.current;
      const legal = game.moves({ verbose: true });
      if (legal.length) {
        const move = legal[Math.floor(Math.random() * legal.length)];
        game.move({ from: move.from, to: move.to, promotion: "q" });
        setNotice(`Ход компьютера: ${move.san}`);
      }
      setIsThinking(false);
      refreshGame();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [gameFen, gameMode, refreshGame]);

  return (
    <div className="bcm-app-container">
      {/* Боковое меню слева */}
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

      {/* Основная рабочая область */}
      <main className="bcm-main-content">
        {/* Центральная колонка: Шахматная доска и Панель управления */}
        <section className="bcm-board-column">
          <div className="bcm-board-card">
            <div className="bcm-board-frame">
              <div className="bcm-files top-files">
                {"abcdefgh".split("").map((f) => (
                  <span key={f}>{f}</span>
                ))}
              </div>
              <div className="bcm-board-with-ranks">
                <div
                  className={`bcm-board-wrapper ${piecesVisible ? "pieces-visible" : "blind-mode"}`}
                >
                  <Chessboard
                    options={{
                      position: gameFen,
                      onPieceDrop: onDrop,
                      onSquareClick,
                      squareStyles: optionSquares,
                      allowDragging: !isThinking,
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

            {/* Панель действий под доской */}
            <div className="bcm-actions-panel">
              <button className="bcm-btn-action" onClick={resetGame}>
                Начать заново
              </button>
              <button
                className="bcm-btn-action"
                onClick={() => setPiecesVisible(!piecesVisible)}
              >
                {piecesVisible ? "Скрыть позицию" : "Посмотреть позицию"}
              </button>
              <button
                className="bcm-btn-action"
                onClick={() => setNotice("Ход пропущен")}
              >
                Пропустить
              </button>
              <button
                className="bcm-btn-action"
                onClick={() => setNotice("Подсказка: контролируйте центр")}
              >
                Взять подсказку
              </button>
              <span className="bcm-rating-text">Рейтинг: 1980</span>
            </div>
          </div>
        </section>

        {/* Правая колонка: Сделанные ходы и Форма ввода */}
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
                disabled={!moveInput.trim() || isThinking}
              >
                Сходить
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Модальное окно */}
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
              <p>{gameStatus}. Выберите, что делать дальше.</p>
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
                Введите ход в формате SAN (например, e4 или Nf3) либо
                координатами (e2e4). В режиме вслепую фигуры скрыты.
              </p>
            )}
            <button
              className="bcm-btn-action"
              onClick={() => {
                if (isEndModalOpen) resetGame();
                setIsSettingsOpen(false);
                setIsHelpOpen(false);
                setIsEndModalOpen(false);
              }}
            >
              {isEndModalOpen ? "Начать новую игру" : "Понятно"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
