
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Chess, Square } from 'chess.js';

const Chessboard = dynamic(
    () => import('react-chessboard').then((mod) => mod.Chessboard),
    { ssr: false }
);

type GameMode = 'ai' | 'pvp';

export default function GamePage() {
    const [activeTab, setActiveTab] = useState('game');

    // =========================
    // ШАХМАТНАЯ ЛОГИКА
    // =========================

    const gameRef = useRef<Chess>(new Chess());

    const [gameFen, setGameFen] = useState<string>(
        gameRef.current.fen()
    );

    const [selectedSquare, setSelectedSquare] =
        useState<Square | null>(null);

    const [optionSquares, setOptionSquares] =
        useState<Record<string, React.CSSProperties>>({});

    // =========================
    // СОСТОЯНИЕ ИГРЫ
    // =========================

    const [gameMode, setGameMode] = useState<GameMode>('ai');

    const [isThinking, setIsThinking] =
        useState(false);

    const [difficulty, setDifficulty] =
        useState('10');

    const [evaluation, setEvaluation] =
        useState('0.00');

    const [moveHistory, setMoveHistory] =
        useState<string[]>([]);

    const [gameStatus, setGameStatus] =
        useState('Ход белых');

    // =========================
    // ОБНОВЛЕНИЕ СОСТОЯНИЯ
    // =========================

    const refreshGame = useCallback(() => {
        const game = gameRef.current;

        setGameFen(game.fen());
        setMoveHistory(game.history());

        if (game.isCheckmate()) {
            setGameStatus(
                `Мат! Победили ${
                    game.turn() === 'w' ? 'чёрные' : 'белые'
                }`
            );
            return;
        }

        if (game.isStalemate()) {
            setGameStatus('Пат! Ничья');
            return;
        }

        if (game.isThreefoldRepetition()) {
            setGameStatus('Ничья! Троекратное повторение');
            return;
        }

        if (game.isInsufficientMaterial()) {
            setGameStatus('Ничья! Недостаточно материала');
            return;
        }

        if (game.isDraw()) {
            setGameStatus('Ничья!');
            return;
        }

        if (game.inCheck()) {
            setGameStatus(
                `Шах! Ход ${
                    game.turn() === 'w' ? 'белых' : 'чёрных'
                }`
            );
            return;
        }

        setGameStatus(
            `Ход ${game.turn() === 'w' ? 'белых' : 'чёрных'}`
        );
    }, []);

    // =========================
    // ОЧИСТКА ПОДСВЕТКИ
    // =========================

    const clearSelection = useCallback(() => {
        setSelectedSquare(null);
        setOptionSquares({});
    }, []);

    // =========================
    // СДЕЛАТЬ ХОД
    // =========================

    const makeMove = useCallback(
        (from: Square, to: Square): boolean => {
            const game = gameRef.current;

            if (game.isGameOver()) {
                return false;
            }

            try {
                const move = game.move({
                    from,
                    to,
                    promotion: 'q',
                });

                if (!move) {
                    return false;
                }

                setEvaluation('0.00');

                clearSelection();
                refreshGame();

                return true;
            } catch {
                return false;
            }
        },
        [clearSelection, refreshGame]
    );

    // =========================
    // ПОКАЗАТЬ ВОЗМОЖНЫЕ ХОДЫ
    // =========================

    const showLegalMoves = useCallback(
        (square: Square) => {
            const game = gameRef.current;

            const piece = game.get(square);

            if (!piece) {
                clearSelection();
                return;
            }

            if (piece.color !== game.turn()) {
                clearSelection();
                return;
            }

            const moves = game.moves({
                square,
                verbose: true,
            });

            const squares: Record<
                string,
                React.CSSProperties
            > = {};

            squares[square] = {
                backgroundColor: 'rgba(255, 255, 0, 0.45)',
            };

            moves.forEach((move) => {
                squares[move.to] = {
                    background:
                        'radial-gradient(circle, rgba(0, 255, 128, 0.7) 0%, rgba(0, 255, 128, 0.7) 15%, transparent 16%)',
                };
            });

            setSelectedSquare(square);
            setOptionSquares(squares);
        },
        [clearSelection]
    );

    // =========================
    // ХОД ПО КЛИКУ
    // =========================

    const onSquareClick = useCallback(
        ({ square }: { piece: unknown; square: string }) => {
            if (isThinking) {
                return;
            }

            const clickedSquare = square as Square;
            const game = gameRef.current;

            // В режиме ИИ человек играет только белыми
            if (
                gameMode === 'ai' &&
                game.turn() !== 'w'
            ) {
                return;
            }

            // Если клетка уже выбрана,
            // пытаемся сделать ход
            if (selectedSquare) {
                const moved = makeMove(
                    selectedSquare,
                    clickedSquare
                );

                if (moved) {
                    return;
                }
            }

            // Если нажали на свою фигуру —
            // показываем возможные ходы
            const piece = game.get(clickedSquare);

            if (
                piece &&
                piece.color === game.turn()
            ) {
                showLegalMoves(clickedSquare);
            } else {
                clearSelection();
            }
        },
        [
            clearSelection,
            gameMode,
            isThinking,
            makeMove,
            selectedSquare,
            showLegalMoves,
        ]
    );

    // =========================
    // DRAG & DROP
    // =========================

    const onDrop = useCallback(
        ({
            sourceSquare,
            targetSquare,
        }: {
            piece: unknown;
            sourceSquare: string;
                targetSquare: string | null;
        }) => {
            if (isThinking || !targetSquare) {
                return false;
            }

            const game = gameRef.current;

            if (game.isGameOver()) {
                return false;
            }

            // В режиме ИИ можно двигать только белыми
            if (
                gameMode === 'ai' &&
                game.turn() !== 'w'
            ) {
                return false;
            }

            const success = makeMove(
                sourceSquare as Square,
                targetSquare as Square
            );

            return success;
        },
        [gameMode, isThinking, makeMove]
    );

    // =========================
    // ПРОСТОЙ ИИ
    // =========================

    const makeAIMove = useCallback(() => {
        const game = gameRef.current;

        if (game.isGameOver()) {
            setIsThinking(false);
            return;
        }

        if (gameMode !== 'ai') {
            setIsThinking(false);
            return;
        }

        if (game.turn() !== 'b') {
            setIsThinking(false);
            return;
        }

        setIsThinking(true);

        // Небольшая задержка,
        // чтобы ход ИИ выглядел естественно
        setTimeout(() => {
            const currentGame = gameRef.current;

            if (
                currentGame.isGameOver() ||
                currentGame.turn() !== 'b'
            ) {
                setIsThinking(false);
                return;
            }

            const possibleMoves =
                currentGame.moves({
                    verbose: true,
                });

            if (possibleMoves.length === 0) {
                setIsThinking(false);
                return;
            }

            /*
             * Пока Stockfish не подключен,
             * выбираем случайный легальный ход.
             *
             * Позже сюда можно подключить настоящий ИИ.
             */

            const randomIndex = Math.floor(
                Math.random() * possibleMoves.length
            );

            const selectedMove =
                possibleMoves[randomIndex];

            try {
                currentGame.move({
                    from: selectedMove.from,
                    to: selectedMove.to,
                    promotion: 'q',
                });

                setGameFen(currentGame.fen());
                setMoveHistory(
                    currentGame.history()
                );
                setEvaluation('0.00');

                refreshGame();
                clearSelection();
            } catch {
                // Ничего не делаем,
                // если вдруг ход оказался некорректным
            }

            setIsThinking(false);
        }, 500);
    }, [
        clearSelection,
        gameMode,
        refreshGame,
    ]);

    // =========================
    // АВТОМАТИЧЕСКИЙ ХОД ИИ
    // =========================

    useEffect(() => {
        if (gameMode !== 'ai') {
            return;
        }

        const game = gameRef.current;

        if (
            game.turn() === 'b' &&
            !game.isGameOver() &&
            !isThinking
        ) {
            const timer = setTimeout(() => {
                makeAIMove();
            }, 300);

            return () => {
                clearTimeout(timer);
            };
        }
    }, [
        gameFen,
        gameMode,
        isThinking,
        makeAIMove,
    ]);

    // =========================
    // СБРОС ИГРЫ
    // =========================

    const resetGame = useCallback(() => {
        gameRef.current.reset();

        setGameFen(
            gameRef.current.fen()
        );

        setSelectedSquare(null);
        setOptionSquares({});
        setMoveHistory([]);
        setEvaluation('0.00');
        setIsThinking(false);
        setGameStatus('Ход белых');
    }, []);

    // =========================
    // СМЕНА РЕЖИМА
    // =========================

    const changeGameMode = (
        mode: GameMode
    ) => {
        setGameMode(mode);
        resetGame();
    };

    return (
        <div className="menu-container">

            {/* =========================
                ЛЕВОЕ МЕНЮ
            ========================= */}

            <aside className="menu-left">

                <div className="logo">
                    <span className="logo-piece">
                        ♟
                    </span>

                    <span className="project-name">
                        Chess App
                    </span>
                </div>

                <div className="menu-wrapper">

                    <div className="info-group">

                        <button
                            className={`menu-href ${
                                activeTab === 'game'
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveTab('game')
                            }
                        >
                            🎮 Игра
                        </button>

                        <button
                            className={`menu-href ${
                                activeTab === 'puzzles'
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveTab('puzzles')
                            }
                        >
                            🧩 Задачи
                        </button>

                        <button
                            className={`menu-href ${
                                activeTab === 'rating'
                                    ? 'active'
                                    : ''
                            }`}
                            onClick={() =>
                                setActiveTab('rating')
                            }
                        >
                            🏆 Рейтинг
                        </button>

                        <hr />

                        <button className="menu-href">
                            ⚙️ Настройки
                        </button>

                    </div>

                    <div className="menu-bottom">

                        <div className="accaunt">

                            <span className="account-title">
                                Аккаунт
                            </span>

                            <div className="account-card">

                                <span className="account-name">
                                    Grandmaster_99
                                </span>

                                <span className="level">
                                    1500 ELO
                                </span>

                            </div>

                        </div>

                    </div>

                </div>

            </aside>

            {/* =========================
                ОСНОВНАЯ ЧАСТЬ
            ========================= */}

            <main className="menu-right">

                <div className="game-container">

                    <div className="title">
                        Шахматная партия
                    </div>

                    <div className="game-right">

                        {/* =========================
                            ПАНЕЛЬ УПРАВЛЕНИЯ
                        ========================= */}

                        <div className="left_panel">

                            <div className="title-info">
                                Режим игры
                            </div>

                            <div className="mode-buttons">

                                <button
                                    className={`btn ${
                                        gameMode === 'ai'
                                            ? 'btn-active'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        changeGameMode('ai')
                                    }
                                >
                                    🤖 Против ИИ
                                </button>

                                <button
                                    className={`btn ${
                                        gameMode === 'pvp'
                                            ? 'btn-active'
                                            : ''
                                    }`}
                                    onClick={() =>
                                        changeGameMode('pvp')
                                    }
                                >
                                    👥 Вдвоём
                                </button>

                            </div>

                            <div className="difficulty-title">
                                Сложность ИИ
                            </div>

                            <select
                                value={difficulty}
                                onChange={(e) =>
                                    setDifficulty(
                                        e.target.value
                                    )
                                }
                                disabled={
                                    gameMode !== 'ai'
                                }
                            >
                                <option value="3">
                                    Легкий
                                </option>

                                <option value="10">
                                    Средний
                                </option>

                                <option value="18">
                                    Сложный
                                </option>
                            </select>

                            <button
                                className="btn reset-btn"
                                onClick={resetGame}
                            >
                                🔄 Сбросить доску
                            </button>

                        </div>

                        {/* =========================
                            ДОСКА
                        ========================= */}

                        <div className="board-wrapper">

                            <Chessboard
                                options={{
                                    position: gameFen,
                                    onPieceDrop: onDrop,
                                    onSquareClick,
                                    squareStyles: optionSquares,
                                    allowDragging: !isThinking,
                                    animationDurationInMs: 150,
                                    boardStyle: {
                                        borderRadius: '20px',
                                        boxShadow:
                                            '0 10px 25px rgba(0,0,0,0.5)',
                                        overflow: 'hidden',
                                    },
                                    darkSquareStyle: {
                                        backgroundColor: '#403C53',
                                    },
                                    lightSquareStyle: {
                                        backgroundColor: '#ffffff',
                                    },
                                }}
                            />

                        </div>

                        {/* =========================
                            ИНФОРМАЦИЯ
                        ========================= */}

                        <div className="right-info">

                            <div className="game-info">

                                <div className="list-item">

                                    <span>
                                        Статус:
                                    </span>

                                    <span className="button-status">
                                        {isThinking
                                            ? 'ИИ думает...'
                                            : gameStatus}
                                    </span>

                                </div>

                                <div className="list-item">

                                    <span>
                                        Оценка:
                                    </span>

                                    <span className="reiting">
                                        {evaluation}
                                    </span>

                                </div>

                            </div>

                            {/* =========================
                                ИСТОРИЯ ХОДОВ
                            ========================= */}

                            <div className="moves_panel_chess">

                                <div className="moves-title">
                                    История ходов
                                </div>

                                {moveHistory.length ===
                                0 ? (
                                    <div className="empty-history">
                                        Ходов пока нет
                                    </div>
                                ) : (
                                    <div className="moves-list">

                                        {moveHistory.map(
                                            (
                                                move,
                                                index
                                            ) => (
                                                <div
                                                    className={
                                                        index %
                                                            2 ===
                                                        0
                                                            ? 'move white-move'
                                                            : 'move black-move'
                                                    }
                                                    key={`${move}-${index}`}
                                                >
                                                    {index %
                                                        2 ===
                                                    0
                                                        ? `${
                                                              Math.floor(
                                                                  index /
                                                                      2
                                                              ) +
                                                              1
                                                          }. ${move}`
                                                        : move}
                                                </div>
                                            )
                                        )}

                                    </div>
                                )}

                            </div>

                        </div>

                    </div>

                </div>

            </main>

        </div>
    );
}

