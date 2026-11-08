'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Chess, type Square } from 'chess.js';
import MenuBtn from '@/src/components/menu-btn';
import Modal from '@/src/components/modal';

const tasks = [
  {
    title: 'Задача 1',
    difficulty: 'easy',
    description: 'Найдите мат в один ход.',
    fen: '7k/8/5KQ1/8/8/8/8/8 w - - 0 1',
    solution: 'g6g7',
    rating: 100,
  },
  {
    title: 'Задача 2',
    difficulty: 'medium',
    description: 'Найдите мат в один ход.',
    fen: '7k/6pp/5KQ1/8/8/8/8/8 w - - 0 1',
    solution: 'g6g7',
    rating: 150,
  },
];

const pieces: Record<string, string> = {
  wk: '♔', wq: '♕', wr: '♖', wb: '♗', wn: '♘', wp: '♙',
  bk: '♚', bq: '♛', br: '♜', bb: '♝', bn: '♞', bp: '♟',
};

export default function Tactics() {
  const [taskIndex, setTaskIndex] = useState(0);
  const [game, setGame] = useState(
    () => new Chess(tasks[0].fen)
  );
  const [answer, setAnswer] = useState('');
  const [message, setMessage] = useState('');
  const [solved, setSolved] = useState(false);
  const [score, setScore] = useState(0);
  const [selectedSquare, setSelectedSquare] =
    useState<Square | null>(null);
  const [difficulty, setDifficulty] = useState('all');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [blindMode, setBlindMode] = useState(false);
  const [showPieces, setShowPieces] = useState(true);

  const task = tasks[taskIndex];

  function loadTask(index: number) {
    const nextIndex = (index + tasks.length) % tasks.length;
    setTaskIndex(nextIndex);
    setGame(new Chess(tasks[nextIndex].fen));
    setAnswer('');
    setMessage('');
    setSolved(false);
    setSelectedSquare(null);
  }

  function submitMove(rawMove: string) {
    if (solved) return;

    const value = rawMove.trim();
    if (!value) {
      setMessage('Введите ход, например g6g7.');
      return;
    }

    const nextGame = new Chess(game.fen());
    let move;

    try {
      const uci = value.match(
        /^([a-h][1-8])\s*[-x]?\s*([a-h][1-8])(?:=?([qrbn]))?$/i
      );

      if (uci) {
        move = nextGame.move({
          from: uci[1].toLowerCase() as Square,
          to: uci[2].toLowerCase() as Square,
          promotion: (uci[3] || 'q').toLowerCase(),
        });
      } else {
        move = nextGame.move(value);
      }
    } catch {
      move = null;
    }

    if (!move) {
      setMessage('Такого легального хода нет. Попробуйте ещё раз.');
      return;
    }

    const playedUci = move.from + move.to + (move.promotion || '');
    const expected = task.solution.toLowerCase();

    if (playedUci !== expected) {
      setMessage('Ход легальный, но это не решение задачи. Попробуйте другой ход.');
      return;
    }

    setGame(nextGame);
    setSolved(true);
    setScore((previous) => previous + task.rating);
    setMessage(
      nextGame.isCheckmate()
        ? 'Верно! Шах и мат!'
        : 'Верно! Задача решена.'
    );
    setAnswer('');
    setSelectedSquare(null);
  }

  function handleSquareClick(square: Square) {
    if (solved) return;

    const piece = game.get(square);

    if (!selectedSquare) {
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    const moveText = `${selectedSquare}${square}`;
    setSelectedSquare(null);
    setMessage('');
    submitMove(moveText);
  }

  const history = game.history();

  return (
    <>
      <div className="menu-container tactics-page">
        <aside className="menu-left">
          <div className="menu-wrapper">
            <div className="menu-top">
              <div className="menu-after">
                <p className="project-name">Blind chess master</p>

                <div className="account">
                  <p className="account-title">Аккаунт</p>
                  <div className="logo">
                    <Image
                      src="/user-icon.png"
                      width={100}
                      height={100}
                      alt="Аватар пользователя"
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

            <div className="menu-bottom">
              <button
                className="menu-href modal-btn"
                onClick={() => setIsSettingsOpen(true)}
              >
                Настройки
              </button>
              <button
                className="menu-href modal-btn"
                onClick={() => setIsHelpOpen(true)}
              >
                Помощь
              </button>
            </div>
          </div>
        </aside>

        <main className="tactics-content">
          <div className="game-right tactics-layout">
            <section className="moves-panel">
              <p className="title">{task.title}</p>
              <p className="task-description">{task.description}</p>

              <div className="moves_panel_chess tactics-history">
                <p className="moves-title">История ходов</p>

                {history.length === 0 ? (
                  <p className="empty-history">
                    Сделайте первый ход на доске или введите его ниже.
                  </p>
                ) : (
                  <div className="tactics-move-list">
                    {Array.from(
                      { length: Math.ceil(history.length / 2) },
                      (_, i) => (
                        <div className="tactics-move-row" key={i}>
                          <span>{i + 1}.</span>
                          <span>{history[i * 2]}</span>
                          <span>{history[i * 2 + 1] || ''}</span>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>

              <form
                className="tactics-input"
                onSubmit={(event) => {
                  event.preventDefault();
                  submitMove(answer);
                }}
              >
                <label htmlFor="move-answer">Ваш ход</label>
                <input
                  id="move-answer"
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                  placeholder="Например, g6g7 или Qg7#"
                  disabled={solved}
                />
                <button type="submit" disabled={solved}>
                  Проверить
                </button>
              </form>

              <p
                className={`tactics-message ${
                  solved ? 'success' : ''
                }`}
                aria-live="polite"
              >
                {message || 'Найдите лучший ход.'}
              </p>
            </section>

            <section className="chess-board 333">
              <div className="tactics-board-heading">
                <div>
                  <p className="title">Решение задачи</p>
                  <p className="task-subtitle">
                    {solved ? 'Задача решена' : 'Ход белых'}
                  </p>
                </div>
                <span className="tactics-rating">
                  +{solved ? task.rating : 0} очков
                </span>
              </div>

              <div
                className={`tactics-board ${
                  blindMode && !showPieces ? 'blind-board' : ''
                }`}
              >
                {Array.from({ length: 8 }, (_, row) =>
                  Array.from({ length: 8 }, (_, col) => {
                    const square = `${'abcdefgh'[col]}${8 - row}` as Square;
                    const piece = game.get(square);
                    const isDark = (row + col) % 2 === 0;
                    const isSelected = selectedSquare === square;
                    const isLastMove = game.history({ verbose: true }).slice(-1).some(
                      (move) => move.from === square || move.to === square
                    );

                    const pieceKey = piece
                      ? `${piece.color === 'w' ? 'w' : 'b'}${piece.type}`
                      : '';

                    return (
                      <button
                        key={square}
                        type="button"
                        aria-label={`${square}${piece ? `, фигура ${pieceKey}` : ''}`}
                        className={[
                          'tactics-square',
                          isDark ? 'square-dark' : 'square-light',
                          isSelected ? 'square-selected' : '',
                          isLastMove ? 'square-last-move' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => handleSquareClick(square)}
                      >
                        {piece && (
                          <span
                            className={`chess-piece ${
                              piece.color === 'w' ? 'piece-white' : 'piece-black'
                            }`}
                          >
                            {pieces[pieceKey]}
                          </span>
                        )}
                        {col === 0 && (
                          <span className="rank-coordinate">{8 - row}</span>
                        )}
                        {row === 7 && (
                          <span className="file-coordinate">
                            {'abcdefgh'[col]}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="tactics-board-options">
                <label>
                  Сложность
                  <select
                    value={difficulty}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDifficulty(value);
                      const index = value === 'all'
                        ? 0
                        : Math.max(0, tasks.findIndex(
                            (item) => item.difficulty === value
                          ));
                      loadTask(index);
                    }}
                  >
                    <option value="all">Все уровни</option>
                    <option value="easy">Лёгкий</option>
                    <option value="medium">Средний</option>
                    <option value="hard">Сложный</option>
                  </select>
                </label>
                <span className="tactics-total-score">
                  Рейтинг: {score}
                </span>
              </div>

              <div className="tactics-actions">
                <button
                  className="btn"
                  onClick={() => loadTask(taskIndex + 1)}
                >
                  {solved ? 'Следующая задача' : 'Пропустить задачу'}
                </button>
                <button
                  className="btn"
                  onClick={() => loadTask(taskIndex)}
                >
                  Начать заново
                </button>
              </div>
            </section>
          </div>
        </main>
      </div>

      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Настройки игры"
      >
        <div className="setting-item">
          <label htmlFor="blind-mode">Режим полной слепоты:</label>
          <input
            id="blind-mode"
            type="checkbox"
            checked={blindMode}
            onChange={(event) => setBlindMode(event.target.checked)}
          />
        </div>
        <div className="setting-item">
          <label htmlFor="show-pieces">Показывать фигуры:</label>
          <input
            id="show-pieces"
            type="checkbox"
            checked={showPieces}
            onChange={(event) => setShowPieces(event.target.checked)}
          />
        </div>
      </Modal>

      <Modal
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        title="Помощь и правила"
      >
        <p>
          <strong>Blind Chess Master</strong> — тренажёр тактического
          мышления и игры вслепую.
        </p>
        <p>Выберите фигуру, затем клетку назначения, либо введите ход:</p>
        <ul>
          <li><code>g6g7</code> — координатная запись.</li>
          <li><code>Qg7#</code> — шахматная нотация.</li>
        </ul>
        <p>За верное решение начисляются очки.</p>
      </Modal>
    </>
  );
}