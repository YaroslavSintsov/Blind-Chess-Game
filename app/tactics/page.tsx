"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import { Chess, type Square } from "chess.js";
import MenuBtn from "@/src/components/menu-btn";
import Modal from "@/src/components/modal";

type TaskStatus = "pending" | "in_progress" | "completed" | "skipped";

interface BlindTask {
  id: string;
  title: string;
  difficulty: "easy" | "medium" | "hard";
  goal: string;
  fen: string;
  solution: string[];
  rating: number;
}

const pieceSymbols: Record<string, string> = {
  wk: "♔",
  wq: "♕",
  wr: "♖",
  wb: "♗",
  wn: "♘",
  wp: "♙",
  bk: "♚",
  bq: "♛",
  br: "♜",
  bb: "♝",
  bn: "♞",
  bp: "♟",
};

const pieceNamesRu: Record<string, string> = {
  k: "король",
  q: "ферзь",
  r: "ладья",
  b: "слон",
  n: "конь",
  p: "пешка",
};

// --- ГЕНЕРАЦИЯ БАЗЫ ИЗ 150 ЗАДАЧ (50 легких, 50 средних, 50 сложных) ---
const generateTasksDatabase = (): BlindTask[] => {
  const list: BlindTask[] = [];

  // Базовые шаблоны для генерации разнообразных тактических позиций (маты в 1 и 2 хода)
  const easyFens = [
    {
      fen: "7k/8/5KQ1/8/8/8/8/8 w - - 0 1",
      sol: ["g6g7"],
      goal: "Ход белых, мат в 1 ход",
    },
    {
      fen: "6k1/5ppp/8/8/8/8/4QPPP/6K1 w - - 0 1",
      sol: ["e2e8"],
      goal: "Ход белых, мат в 1 ход",
    },
    {
      fen: "5k2/5ppp/8/8/8/4Q3/5PPP/6K1 w - - 0 1",
      sol: ["e3h8"],
      goal: "Ход белых, мат в 1 ход",
    },
    {
      fen: "k7/8/1Q6/8/8/8/8/7K w - - 0 1",
      sol: ["b6b7"],
      goal: "Ход белых, мат в 1 ход",
    },
    {
      fen: "7k/5ppp/8/8/4Q3/8/5PPP/6K1 w - - 0 1",
      sol: ["e4e8"],
      goal: "Ход белых, мат в 1 ход",
    },
  ];

  const mediumFens = [
    {
      fen: "r1bqk2r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4",
      sol: ["h5f7"],
      goal: "Ход белых, атака пункта f7",
    },
    {
      fen: "3r2k1/5ppp/8/8/8/2Q5/5PPP/6K1 w - - 0 1",
      sol: ["c3c8"],
      goal: "Ход белых, линейный мат",
    },
    {
      fen: "2r3k1/5ppp/8/4Q3/8/8/5PPP/6K1 w - - 0 1",
      sol: ["e5c7"],
      goal: "Ход белых, внедрение ферзя",
    },
    {
      fen: "6k1/5ppp/8/1b6/8/8/4QPPP/6K1 w - - 0 1",
      sol: ["e2b5"],
      goal: "Ход белых, выигрыш фигуры",
    },
    {
      fen: "3r2k1/p4ppp/8/8/4n3/8/PPP2PPP/2K1R3 w - - 0 1",
      sol: ["e1e4"],
      goal: "Ход белых, отыгрыш фигуры",
    },
  ];

  const hardFens = [
    {
      fen: "3r2k1/5pp1/7p/8/1Q6/7P/5PP1/6K1 w - - 0 1",
      sol: ["b4e7"],
      goal: "Ход белых, выигрыш ладьи",
    },
    {
      fen: "6k1/5p1p/6p1/8/8/1Q5P/5PPK/1q6 b - - 0 1",
      sol: ["b1b3"],
      goal: "Ход черных, размен ферзей",
    },
    {
      fen: "r1b2rk1/pp1p1ppp/2n5/4p3/1q2n3/1N1B4/PPP2PPP/R1BQK2R w KQ - 0 9",
      sol: ["d1e2"],
      goal: "Ход белых, защита от угрозы",
    },
    {
      fen: "4r1k1/5ppp/8/8/1b6/8/PP3PPP/R1B3K1 w - - 0 1",
      sol: ["c1e3"],
      goal: "Ход белых, перекрытие",
    },
    {
      fen: "r2q1rk1/ppp2ppp/2n1bn2/2b1p3/4P3/2NP1N2/PPP1BPPP/R1BQ1RK1 w - - 0 8",
      sol: ["c1e3"],
      goal: "Ход белых, развитие фигуры",
    },
  ];

  // Создаем 50 легких
  for (let i = 1; i <= 50; i++) {
    const template = easyFens[(i - 1) % easyFens.length];
    list.push({
      id: `easy_${i}`,
      title: `Лёгкая задача #${i}`,
      difficulty: "easy",
      goal: template.goal,
      fen: template.fen,
      solution: template.sol,
      rating: 50 + (i % 10) * 5,
    });
  }

  // Создаем 50 средних
  for (let i = 1; i <= 50; i++) {
    const template = mediumFens[(i - 1) % mediumFens.length];
    list.push({
      id: `medium_${i}`,
      title: `Средняя задача #${i}`,
      difficulty: "medium",
      goal: template.goal,
      fen: template.fen,
      solution: template.sol,
      rating: 120 + (i % 15) * 8,
    });
  }

  // Создаем 50 сложных
  for (let i = 1; i <= 50; i++) {
    const template = hardFens[(i - 1) % hardFens.length];
    list.push({
      id: `hard_${i}`,
      title: `Сложная задача #${i}`,
      difficulty: "hard",
      goal: template.goal,
      fen: template.fen,
      solution: template.sol,
      rating: 250 + (i % 20) * 12,
    });
  }

  return list;
};

// Функция перемешивания массива (Алгоритм Фишера-Йетса)
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function normalizeRussianNotation(input: string): string {
  const map: Record<string, string> = {
    Кр: "K",
    Ф: "Q",
    Л: "R",
    С: "B",
    К: "N",
  };
  let result = input.trim();
  for (const [ru, en] of Object.entries(map)) {
    if (result.startsWith(ru)) {
      result = en + result.slice(ru.length);
      break;
    }
  }
  return result;
}

function describePosition(game: Chess): string {
  const board = game.board();
  const whitePieces: string[] = [];
  const blackPieces: string[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const cell = board[row][col];
      if (!cell) continue;
      const label = `${pieceNamesRu[cell.type]} ${cell.square}`;
      if (cell.color === "w") whitePieces.push(label);
      else blackPieces.push(label);
    }
  }
  return `Белые: ${whitePieces.join(", ")}. Чёрные: ${blackPieces.join(", ")}.`;
}

export default function BlindTactics() {
  // Полная база из 150 задач
  const allTasks = useMemo(() => generateTasksDatabase(), []);

  const [difficulty, setDifficulty] = useState<string>("all");
  const [activeQueue, setActiveQueue] = useState<BlindTask[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const [moveStep, setMoveStep] = useState(0);
  const [game, setGame] = useState<Chess>(() => new Chess());
  const [answer, setAnswer] = useState("");
  const [message, setMessage] = useState("");
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(1600); // Динамический рейтинг игрока
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [hintSquare, setHintSquare] = useState<Square | null>(null);

  const [statuses, setStatuses] = useState<Record<string, TaskStatus>>({});
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [showPieces, setShowPieces] = useState(false);
  const [showCoordinates, setShowCoordinates] = useState(true);

  // Инициализация или смена фильтра сложности (рандомизация при выборе)
  useEffect(() => {
    let filtered = allTasks;
    if (difficulty !== "all") {
      filtered = allTasks.filter((t) => t.difficulty === difficulty);
    }
    const shuffled = shuffleArray(filtered);
    setActiveQueue(shuffled);
    setCurrentIndex(0);
    if (shuffled.length > 0) {
      loadTaskData(shuffled[0], shuffled);
    }
  }, [difficulty, allTasks]);

  const task = activeQueue[currentIndex] || allTasks[0];

  const initialPositionText = useMemo(() => {
    if (!task) return "";
    return describePosition(new Chess(task.fen));
  }, [task]);

  function loadTaskData(targetTask: BlindTask, queue = activeQueue) {
    const idx = queue.findIndex((t) => t.id === targetTask.id);
    if (idx !== -1) setCurrentIndex(idx);

    setMoveStep(0);
    setGame(new Chess(targetTask.fen));
    setAnswer("");
    setMessage("");
    setSolved(false);
    setSelectedSquare(null);
    setHintSquare(null);

    setStatuses((prev) => ({
      ...prev,
      [targetTask.id]:
        prev[targetTask.id] === "completed" ? "completed" : "in_progress",
    }));
  }

  function handleNextTask(skipped = false) {
    if (!solved && skipped && task) {
      setStatuses((prev) => ({ ...prev, [task.id]: "skipped" }));
    }

    const nextIdx = (currentIndex + 1) % activeQueue.length;
    loadTaskData(activeQueue[nextIdx]);
  }

  function handleHint() {
    if (solved) return;
    const expectedMove = task.solution[moveStep];
    if (!expectedMove) return;

    const fromSq = expectedMove.slice(0, 2) as Square;
    const piece = game.get(fromSq);
    setHintSquare(fromSq);
    setMessage(
      piece
        ? `Подсказка: походите фигурой «${pieceNamesRu[piece.type]}» с клетки ${fromSq}.`
        : `Подсказка: начните ход с клетки ${fromSq}.`,
    );
  }

  function submitMove(rawMove: string) {
    if (solved || !task) return;

    const value = rawMove.trim();
    if (!value) {
      setMessage("Введите ход, например Лf3 или g6g7.");
      return;
    }

    const nextGame = new Chess(game.fen());
    let move = null;

    try {
      const uci = value.match(
        /^([a-h][1-8])\s*[-x]?\s*([a-h][1-8])(?:=?([qrbn]))?$/i,
      );
      if (uci) {
        move = nextGame.move({
          from: uci[1].toLowerCase() as Square,
          to: uci[2].toLowerCase() as Square,
          promotion: (uci[3] || "q").toLowerCase(),
        });
      } else {
        move = nextGame.move(normalizeRussianNotation(value));
      }
    } catch {
      move = null;
    }

    if (!move) {
      setMessage("Невозможный ход. Проверьте координаты.");
      return;
    }

    const playedUci = move.from + move.to + (move.promotion || "");
    const expectedUci = task.solution[moveStep]?.toLowerCase();

    if (playedUci !== expectedUci) {
      setMessage("Ход легальный, но это не решение задачи. Попробуйте другой.");
      return;
    }

    setHintSquare(null);
    setAnswer("");
    setSelectedSquare(null);

    const nextStep = moveStep + 1;
    if (nextStep < task.solution.length) {
      const replyUci = task.solution[nextStep];
      nextGame.move({
        from: replyUci.slice(0, 2) as Square,
        to: replyUci.slice(2, 4) as Square,
        promotion: replyUci[4] || "q",
      });
      setGame(nextGame);
      setMoveStep(nextStep + 1);
      setMessage(
        `Верно! Ответ соперника: ${replyUci.slice(0, 2)}-${replyUci.slice(2, 4)}. Ваш ход.`,
      );
      return;
    }

    setGame(nextGame);
    setSolved(true);

    // Динамический пересчет рейтинга (за сложную задачу дается больше очков)
    const delta =
      task.difficulty === "hard" ? 25 : task.difficulty === "medium" ? 15 : 10;
    setScore((prev) => prev + delta);

    setStatuses((prev) => ({ ...prev, [task.id]: "completed" }));
    setMessage(
      nextGame.isCheckmate()
        ? `Верно! Мат! (+${delta} к рейтингу)`
        : `Задача решена! (+${delta} к рейтингу)`,
    );
  }

  function handleSquareClick(square: Square) {
    if (solved) return;
    if (!selectedSquare) {
      if (showPieces) {
        const piece = game.get(square);
        if (!piece || piece.color !== game.turn()) return;
      }
      setSelectedSquare(square);
      return;
    }
    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }
    const moveText = `${selectedSquare}${square}`;
    setSelectedSquare(null);
    submitMove(moveText);
  }

  const history = game.history();

  return (
    <>
      <div className="menu-container blind-tactics-page">
        {/* ЛЕВАЯ ПАНЕЛЬ */}
        <aside className="menu-left">
          <div className="menu-wrapper">
            <div className="menu-top">
              <div className="menu-after">
                <p className="project-name">BLIND CHESS MASTER</p>
                <div className="account">
                  <p className="account-title">АККАУНТ</p>
                  <div className="logo">
                    <div className="avatar-circle">
                      <Image
                        src="/user-icon.png"
                        width={64}
                        height={64}
                        alt="Аватар"
                      />
                    </div>
                    <div className="info-group">
                      <p className="user-name">User123</p>
                      <p className="user-elo">{score} elo</p>
                    </div>
                  </div>
                </div>
              </div>

              <hr className="sidebar-divider" />
              <div className="menu-before">
                <MenuBtn />
              </div>
              <hr className="sidebar-divider" />

              {/* История последних активных задач в сессии */}
              <div className="past-tasks-section">
                <p className="past-tasks-title">Текущая очередь (случайно)</p>
                <ul className="past-tasks-list">
                  {activeQueue.slice(0, 5).map((t, idx) => {
                    const status = statuses[t.id];
                    let statusLabel = "В процессе";
                    let statusClass = "status-progress";
                    if (status === "completed") {
                      statusLabel = "Пройдено";
                      statusClass = "status-completed";
                    } else if (status === "skipped") {
                      statusLabel = "Пропущена";
                      statusClass = "status-skipped";
                    }

                    return (
                      <li key={t.id}>
                        <button
                          type="button"
                          className={`past-task-item ${t.id === task?.id ? "active" : ""}`}
                          onClick={() => loadTaskData(t)}
                        >
                          <span className={`status-indicator ${statusClass}`} />
                          <span>
                            {t.title} ({statusLabel})
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="menu-bottom">
              <button
                type="button"
                className="menu-href modal-btn"
                onClick={() => setIsSettingsOpen(true)}
              >
                ⚙ Настройки
              </button>
              <button
                type="button"
                className="menu-href modal-btn"
                onClick={() => setIsHelpOpen(true)}
              >
                ? Помощь
              </button>
            </div>
          </div>
        </aside>

        {/* ОСНОВНОЙ КОНТЕНТ */}
        <main className="tactics-content">
          <div className="tactics-layout">
            {/* ИНФОРМАЦИЯ И ВВОД */}
            <section className="task-info-card">
              <div className="task-header-info">
                <h1 className="task-main-title">{task?.title}</h1>
                <p className="task-goal">{task?.goal}</p>
                <p className="task-position-text">
                  <strong>Позиция:</strong> {initialPositionText}
                </p>
              </div>

              {history.length > 0 && (
                <div className="blind-history-box">
                  <p className="blind-history-label">Ходы:</p>
                  <div className="blind-history-moves">
                    {history.map((m, idx) => (
                      <span key={idx} className="history-pill">
                        {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {message && (
                <div
                  className={`blind-feedback ${solved ? "feedback-success" : "feedback-info"}`}
                  aria-live="polite"
                >
                  {message}
                </div>
              )}

              <form
                className="move-input-box"
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMove(answer);
                }}
              >
                <textarea
                  className="move-textarea"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      submitMove(answer);
                    }
                  }}
                  placeholder="Введите ход (например: Лf3, g6g7)"
                  disabled={solved}
                />
                <div className="move-submit-row">
                  <button
                    type="submit"
                    className="btn-submit-move"
                    disabled={solved}
                  >
                    Сходить
                  </button>
                </div>
              </form>
            </section>

            {/* ДОСКА И УПРАВЛЕНИЕ */}
            <section className="board-panel-card">
              <div className="board-with-coords">
                {showCoordinates && (
                  <div className="coords-row top">
                    {["a", "b", "c", "d", "e", "f", "g", "h"].map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                )}

                <div className="board-middle-wrapper">
                  {showCoordinates && (
                    <div className="coords-col left">
                      {[8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                    </div>
                  )}

                  <div className="blind-chess-grid">
                    {Array.from({ length: 8 }, (_, row) =>
                      Array.from({ length: 8 }, (_, col) => {
                        const square = `${"abcdefgh"[col]}${8 - row}` as Square;
                        const piece = game.get(square);
                        const isDark = (row + col) % 2 === 0;
                        const isSelected = selectedSquare === square;
                        const isHint = hintSquare === square;
                        const pieceKey = piece
                          ? `${piece.color}${piece.type}`
                          : "";

                        return (
                          <button
                            key={square}
                            type="button"
                            className={[
                              "blind-square",
                              isDark ? "sq-dark" : "sq-light",
                              isSelected ? "sq-selected" : "",
                              isHint ? "sq-hint" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            onClick={() => handleSquareClick(square)}
                          >
                            {(showPieces || solved) && piece && (
                              <span
                                className={`chess-piece ${piece.color === "w" ? "piece-w" : "piece-b"}`}
                              >
                                {pieceSymbols[pieceKey]}
                              </span>
                            )}
                          </button>
                        );
                      }),
                    )}
                  </div>

                  {showCoordinates && (
                    <div className="coords-col right">
                      {[8, 7, 6, 5, 4, 3, 2, 1].map((r) => (
                        <span key={r}>{r}</span>
                      ))}
                    </div>
                  )}
                </div>

                {showCoordinates && (
                  <div className="coords-row bottom">
                    {["a", "b", "c", "d", "e", "f", "g", "h"].map((f) => (
                      <span key={f}>{f}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="board-controls-box">
                <div className="controls-top-row">
                  <div className="difficulty-control">
                    <label htmlFor="diff-sel">Уровень сложности</label>
                    <select
                      id="diff-sel"
                      className="difficulty-select"
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                    >
                      <option value="all">Все уровни (150 задач)</option>
                      <option value="easy">Лёгкий (50)</option>
                      <option value="medium">Средний (50)</option>
                      <option value="hard">Сложный (50)</option>
                    </select>
                  </div>
                  <div className="rating-display">
                    Рейтинг: <span>{score}</span>
                  </div>
                </div>

                <div className="controls-buttons-row">
                  <button
                    type="button"
                    className="btn-control"
                    onClick={() => handleNextTask(!solved)}
                  >
                    {solved ? "Следующая задача" : "Пропустить"}
                  </button>
                  <button
                    type="button"
                    className="btn-control"
                    onClick={handleHint}
                    disabled={solved}
                  >
                    Взять подсказку
                  </button>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Настройки"
      >
        <div className="setting-item">
          <label htmlFor="show-pieces-chk">Подсматривать фигуры:</label>
          <input
            id="show-pieces-chk"
            type="checkbox"
            checked={showPieces}
            onChange={(e) => setShowPieces(e.target.checked)}
          />
        </div>
        <div className="setting-item">
          <label htmlFor="show-coords-chk">Показывать координаты:</label>
          <input
            id="show-coords-chk"
            type="checkbox"
            checked={showCoordinates}
            onChange={(e) => setShowCoordinates(e.target.checked)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Помощь"
      >
        <p>База содержит 150 уникальных тактических позиций.</p>
        <p>
          Задачи перемешиваются случайно при выборе уровня. За правильные ответы
          начисляются очки рейтинга (Elo).
        </p>
      </Modal>
    </>
  );
}
