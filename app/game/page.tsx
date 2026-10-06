'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Chess, Square } from 'chess.js';
import dynamic from 'next/dynamic';

// Загрузка доски без SSR и без ошибок типов TypeScript
const Chessboard = dynamic(
    () => import('react-chessboard').then((mod: any) => mod.Chessboard || mod.default),
    { ssr: false }
) as any;

export default function GamePage() {
    const [activeTab, setActiveTab] = useState('game');

    // Экземпляр шахматной логики
    const gameRef = useRef(new Chess());
    const [gameFen, setGameFen] = useState<string>(gameRef.current.fen());
    
    // Выделение клеток
    const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
    const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

    // Состояния Stockfish и статуса
    const engineRef = useRef<Worker | null>(null);
    const [evaluation, setEvaluation] = useState<string>('0.00');
    const [moveHistory, setMoveHistory] = useState<string[]>([]);
    const [gameStatus, setGameStatus] = useState<string>('Ход белых');
    const [difficulty, setDifficulty] = useState<string>('15');

    // Безопасное подключение Stockfish
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                const worker = new Worker('/stockfish.js');
                engineRef.current = worker;

                worker.onmessage = (event: MessageEvent) => {
                    const line = event.data;
                    if (typeof line !== 'string') return;

                    if (line.includes('info depth') && line.includes('score cp')) {
                        const match = line.match(/score cp (-?\d+)/);
                        if (match) {
                            const score = (parseInt(match[1], 10) / 100).toFixed(2);
                            setEvaluation(score);
                        }
                    } else if (line.includes('score mate')) {
                        const match = line.match(/score mate (-?\d+)/);
                        if (match) {
                            setEvaluation(`Мат в ${Math.abs(parseInt(match[1], 10))}`);
                        }
                    }
                };

                worker.postMessage('uci');
                worker.postMessage('isready');
                worker.postMessage('ucinewgame');
                
                analyzePosition(gameRef.current.fen(), difficulty);
            } catch (err) {
                console.warn('Stockfish Worker не запущен:', err);
            }
        }

        return () => {
            if (engineRef.current) {
                engineRef.current.terminate();
            }
        };
    }, []);

    // Анализ позиции
    const analyzePosition = (fen: string, depth: string) => {
        if (!engineRef.current) return;
        try {
            engineRef.current.postMessage(`position fen ${fen}`);
            engineRef.current.postMessage(`go depth ${depth}`);
        } catch (e) {
            console.error('Ошибка Stockfish:', e);
        }
    };

    // Обновление статуса
    const updateStatus = () => {
        const game = gameRef.current;
        if (game.isCheckmate()) {
            setGameStatus(`Мат! Победили ${game.turn() === 'w' ? 'Чёрные' : 'Белые'}`);
        } else if (game.isDraw()) {
            setGameStatus('Ничья!');
        } else if (game.inCheck()) {
            setGameStatus(`Шах! Ход ${game.turn() === 'w' ? 'Белых' : 'Чёрных'}`);
        } else {
            setGameStatus(`Ход ${game.turn() === 'w' ? 'Белых' : 'Чёрных'}`);
        }
    };

    // Главная функция совершения хода
    const makeMove = useCallback((from: string, to: string) => {
        try {
            const game = gameRef.current;
            const move = game.move({
                from,
                to,
                promotion: 'q',
            });

            if (move) {
                const newFen = game.fen();
                setGameFen(newFen);
                setMoveHistory(game.history());
                updateStatus();
                analyzePosition(newFen, difficulty);

                setSelectedSquare(null);
                setOptionSquares({});
                return true;
            }
        } catch {
            return false;
        }
        return false;
    }, [difficulty]);

    // Обработка перетаскивания (Drag-and-Drop)
    const onDrop = (sourceSquare: string, targetSquare: string) => {
        return makeMove(sourceSquare, targetSquare);
    };

    // Обработка кликов (Click-to-Move)
    const onSquareClick = (square: Square) => {
        if (selectedSquare) {
            const moveSuccessful = makeMove(selectedSquare, square);
            if (moveSuccessful) return;
        }

        const piece = gameRef.current.get(square);
        if (piece && piece.color === gameRef.current.turn()) {
            setSelectedSquare(square);

            const moves = gameRef.current.moves({ square, verbose: true });
            const newSquares: Record<string, any> = {
                [square]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
            };

            moves.forEach((m) => {
                newSquares[m.to] = {
                    background: 'radial-gradient(circle, rgba(0,255,128,0.6) 25%, transparent 25%)',
                    borderRadius: '50%'
                };
            });

            setOptionSquares(newSquares);
        } else {
            setSelectedSquare(null);
            setOptionSquares({});
        }
    };

    // Перезапуск игры
    const resetGame = () => {
        gameRef.current.reset();
        const newFen = gameRef.current.fen();
        setGameFen(newFen);
        setMoveHistory([]);
        setSelectedSquare(null);
        setOptionSquares({});
        setEvaluation('0.00');
        setGameStatus('Ход белых');
        analyzePosition(newFen, difficulty);
    };

    const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDepth = e.target.value;
        setDifficulty(newDepth);
        analyzePosition(gameFen, newDepth);
    };

    return (
        <div className="menu-container">
            {/* Меню слева */}
            <aside className="menu-left">
                <div className="logo">
                    <span style={{ fontSize: '24px' }}>♟️</span>
                    <span className="project-name">Chess App</span>
                </div>

                <div className="menu-wrapper">
                    <div className="info-group">
                        <button 
                            className="menu-href" 
                            style={{ textAlign: 'left', color: activeTab === 'game' ? '#ffffff' : '#a0a0a0' }}
                            onClick={() => setActiveTab('game')}
                        >
                            🎮 Игра
                        </button>
                        <button 
                            className="menu-href" 
                            style={{ textAlign: 'left', color: activeTab === 'puzzles' ? '#ffffff' : '#a0a0a0' }}
                            onClick={() => setActiveTab('puzzles')}
                        >
                            🧩 Задачи
                        </button>
                        <button 
                            className="menu-href" 
                            style={{ textAlign: 'left', color: activeTab === 'rating' ? '#ffffff' : '#a0a0a0' }}
                            onClick={() => setActiveTab('rating')}
                        >
                            🏆 Рейтинг
                        </button>
                        
                        <hr />

                        <div className="menu-before">
                            <button className="menu-href">⚙️ Настройки</button>
                        </div>
                    </div>

                    <div className="menu-bottom">
                        <div className="accaunt">
                            <span className="account-title">Аккаунт</span>
                            <div className="list-item">
                                <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Grandmaster_99</span>
                                <span className="level">1500 ELO</span>
                            </div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Игровое поле */}
            <main className="menu-right">
                <div className="game-container">
                    <div className="title">Шахматная партия</div>

                    <div className="game-right">
                        {/* Левая панель */}
                        <div className="left_panel">
                            <div className="title-info">Управление</div>
                            
                            <div className="level" style={{ marginTop: '16px' }}>
                                Сложность анализа:
                            </div>
                            <select value={difficulty} onChange={handleDifficultyChange}>
                                <option value="5">Легкий (глубина 5)</option>
                                <option value="15">Средний (глубина 15)</option>
                                <option value="20">Глубокий (глубина 20)</option>
                            </select>

                            <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button className="btn" onClick={resetGame}>
                                    Новая игра
                                </button>
                            </div>
                        </div>

                        {/* Шахматная доска */}
                        <div className="game-board">
                            <Chessboard 
                                position={gameFen} 
                                onPieceDrop={onDrop}
                                onSquareClick={onSquareClick}
                                customSquareStyles={optionSquares}
                                arePiecesDraggable={true}
                                animationDuration={150}
                                boardWidth={512}
                                customBoardStyle={{
                                    borderRadius: '20px',
                                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                                }}
                                customDarkSquareStyle={{ backgroundColor: '#403C53' }}
                                customLightSquareStyle={{ backgroundColor: '#ffffff' }}
                            />
                        </div>

                        {/* Правая панель */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div className="game-info" style={{ marginTop: 0 }}>
                                <div className="list-item">
                                    <span>Статус:</span>
                                    <button className="button-status">{gameStatus}</button>
                                </div>
                                <div className="list-item">
                                    <span>Оценка Stockfish:</span>
                                    <span className="reiting">{evaluation}</span>
                                </div>
                            </div>

                            <div className="moves_panel_chess" style={{ padding: '20px', overflowY: 'auto' }}>
                                <div className="account-title" style={{ marginBottom: '12px' }}>История ходов</div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
                                    {moveHistory.map((move, index) => (
                                        index % 2 === 0 ? (
                                            <div key={index} style={{ color: '#ffffff', fontWeight: 600 }}>
                                                {Math.floor(index / 2) + 1}. {move}
                                            </div>
                                        ) : (
                                            <div key={index} style={{ color: '#a0a0a0' }}>
                                                {move}
                                            </div>
                                        )
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
// 'use client';

// import { useState, useEffect, useRef } from 'react';
// import { Chess, Square } from 'chess.js';
// import dynamic from 'next/dynamic';

// // Загрузка доски без SSR
// const Chessboard = dynamic(
//     () => import('react-chessboard').then((mod) => mod.Chessboard),
//     { ssr: false }
// ) as any;

// export default function GamePage() {
//     const [activeTab, setActiveTab] = useState('game');

//     // Инициализация шахматной партии
//     const gameRef = useRef(new Chess());
//     const [gameFen, setGameFen] = useState<string>(gameRef.current.fen());
    
//     // Выделение клеток
//     const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
//     const [optionSquares, setOptionSquares] = useState<Record<string, any>>({});

//     // Состояния Stockfish и статуса
//     const engineRef = useRef<Worker | null>(null);
//     const [evaluation, setEvaluation] = useState<string>('0.00');
//     const [moveHistory, setMoveHistory] = useState<string[]>([]);
//     const [gameStatus, setGameStatus] = useState<string>('Ход белых');
//     const [difficulty, setDifficulty] = useState<string>('15');

//     // Безопасное подключение Stockfish
//     useEffect(() => {
//         if (typeof window !== 'undefined') {
//             try {
//                 const worker = new Worker('/stockfish.js');
//                 engineRef.current = worker;

//                 worker.onmessage = (event: MessageEvent) => {
//                     const line = event.data;
//                     if (typeof line !== 'string') return;

//                     if (line.includes('info depth') && line.includes('score cp')) {
//                         const match = line.match(/score cp (-?\d+)/);
//                         if (match) {
//                             const score = (parseInt(match[1], 10) / 100).toFixed(2);
//                             setEvaluation(score);
//                         }
//                     } else if (line.includes('score mate')) {
//                         const match = line.match(/score mate (-?\d+)/);
//                         if (match) {
//                             setEvaluation(`Мат в ${Math.abs(parseInt(match[1], 10))}`);
//                         }
//                     }
//                 };

//                 worker.postMessage('uci');
//                 worker.postMessage('isready');
//                 worker.postMessage('ucinewgame');
                
//                 analyzePosition(gameRef.current.fen(), difficulty);
//             } catch (err) {
//                 console.warn('Stockfish Worker не запущен или отсутствует /public/stockfish.js:', err);
//             }
//         }

//         return () => {
//             if (engineRef.current) {
//                 engineRef.current.terminate();
//             }
//         };
//     }, []);

//     // Оценка позиции
//     const analyzePosition = (fen: string, depth: string) => {
//         if (!engineRef.current) return;
//         try {
//             engineRef.current.postMessage(`position fen ${fen}`);
//             engineRef.current.postMessage(`go depth ${depth}`);
//         } catch (e) {
//             console.error('Ошибка отправки сообщения Stockfish:', e);
//         }
//     };

//     // Обновление статуса партии
//     const updateStatus = () => {
//         const game = gameRef.current;
//         if (game.isCheckmate()) {
//             setGameStatus(`Мат! Победили ${game.turn() === 'w' ? 'Чёрные' : 'Белые'}`);
//         } else if (game.isDraw()) {
//             setGameStatus('Ничья!');
//         } else if (game.inCheck()) {
//             setGameStatus(`Шах! Ход ${game.turn() === 'w' ? 'Белых' : 'Чёрных'}`);
//         } else {
//             setGameStatus(`Ход ${game.turn() === 'w' ? 'Белых' : 'Чёрных'}`);
//         }
//     };

//     // Функция проведения хода
//     const makeMove = (from: string, to: string) => {
//         try {
//             const move = gameRef.current.move({
//                 from,
//                 to,
//                 promotion: 'q',
//             });

//             if (move) {
//                 const newFen = gameRef.current.fen();
//                 setGameFen(newFen);
//                 setMoveHistory(gameRef.current.history());
//                 updateStatus();
//                 analyzePosition(newFen, difficulty);

//                 setSelectedSquare(null);
//                 setOptionSquares({});
//                 return true;
//             }
//         } catch (error) {
//             console.log('Нелегальный ход:', from, '->', to);
//             return false;
//         }
//         return false;
//     };

//     // Drag-and-Drop (Перетаскивание)
//     const onDrop = (sourceSquare: string, targetSquare: string) => {
//         const moveMade = makeMove(sourceSquare, targetSquare);
//         return moveMade;
//     };

//     // Click-to-Move (Клик по фигурам)
//     const onSquareClick = (square: Square) => {
//         if (selectedSquare) {
//             const moveSuccessful = makeMove(selectedSquare, square);
//             if (moveSuccessful) return;
//         }

//         const piece = gameRef.current.get(square);
//         if (piece && piece.color === gameRef.current.turn()) {
//             setSelectedSquare(square);

//             const moves = gameRef.current.moves({ square, verbose: true });
//             const newSquares: Record<string, any> = {
//                 [square]: { backgroundColor: 'rgba(255, 255, 0, 0.4)' }
//             };

//             moves.forEach((m) => {
//                 newSquares[m.to] = {
//                     background: 'radial-gradient(circle, rgba(0,255,128,0.6) 25%, transparent 25%)',
//                     borderRadius: '50%'
//                 };
//             });

//             setOptionSquares(newSquares);
//         } else {
//             setSelectedSquare(null);
//             setOptionSquares({});
//         }
//     };

//     // Сброс партии
//     const resetGame = () => {
//         gameRef.current.reset();
//         const newFen = gameRef.current.fen();
//         setGameFen(newFen);
//         setMoveHistory([]);
//         setSelectedSquare(null);
//         setOptionSquares({});
//         setEvaluation('0.00');
//         setGameStatus('Ход белых');
//         analyzePosition(newFen, difficulty);
//     };

//     const handleDifficultyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
//         const newDepth = e.target.value;
//         setDifficulty(newDepth);
//         analyzePosition(gameFen, newDepth);
//     };

//     return (
//         <div className="menu-container">
//             {/* Меню слева */}
//             <aside className="menu-left">
//                 <div className="logo">
//                     <span style={{ fontSize: '24px' }}>♟️</span>
//                     <span className="project-name">Chess App</span>
//                 </div>

//                 <div className="menu-wrapper">
//                     <div className="info-group">
//                         <button 
//                             className="menu-href" 
//                             style={{ textAlign: 'left', color: activeTab === 'game' ? '#ffffff' : '#a0a0a0' }}
//                             onClick={() => setActiveTab('game')}
//                         >
//                             🎮 Игра
//                         </button>
//                         <button 
//                             className="menu-href" 
//                             style={{ textAlign: 'left', color: activeTab === 'puzzles' ? '#ffffff' : '#a0a0a0' }}
//                             onClick={() => setActiveTab('puzzles')}
//                         >
//                             🧩 Задачи
//                         </button>
//                         <button 
//                             className="menu-href" 
//                             style={{ textAlign: 'left', color: activeTab === 'rating' ? '#ffffff' : '#a0a0a0' }}
//                             onClick={() => setActiveTab('rating')}
//                         >
//                             🏆 Рейтинг
//                         </button>
                        
//                         <hr />

//                         <div className="menu-before">
//                             <button className="menu-href">⚙️ Настройки</button>
//                         </div>
//                     </div>

//                     <div className="menu-bottom">
//                         <div className="accaunt">
//                             <span className="account-title">Аккаунт</span>
//                             <div className="list-item">
//                                 <span style={{ fontSize: '14px', fontWeight: 'bold' }}>Grandmaster_99</span>
//                                 <span className="level">1500 ELO</span>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </aside>

//             {/* Игровое поле справа */}
//             <main className="menu-right">
//                 <div className="game-container">
//                     <div className="title">Шахматная партия</div>

//                     <div className="game-right">
//                         {/* Левая панель */}
//                         <div className="left_panel">
//                             <div className="title-info">Управление</div>
                            
//                             <div className="level" style={{ marginTop: '16px' }}>
//                                 Сложность анализа:
//                             </div>
//                             <select value={difficulty} onChange={handleDifficultyChange}>
//                                 <option value="5">Легкий (глубина 5)</option>
//                                 <option value="15">Средний (глубина 15)</option>
//                                 <option value="20">Глубокий (глубина 20)</option>
//                             </select>

//                             <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
//                                 <button className="btn" onClick={resetGame}>
//                                     Новая игра
//                                 </button>
//                             </div>
//                         </div>

//                         {/* Интерактивная доска */}
//                         <div className="game-board">
//                             <Chessboard 
//                                 position={gameFen} 
//                                 onPieceDrop={onDrop}
//                                 onSquareClick={onSquareClick}
//                                 customSquareStyles={optionSquares}
//                                 arePiecesDraggable={true}
//                                 animationDuration={200}
//                                 boardWidth={512}
//                                 customBoardStyle={{
//                                     borderRadius: '20px',
//                                     boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
//                                     touchAction: 'none', // <-- Отключает вмешательство Chrome в тач-события
//                                 }}
//                                 customDarkSquareStyle={{ backgroundColor: '#403C53' }}
//                                 customLightSquareStyle={{ backgroundColor: '#ffffff' }}
//                             />
//                         </div>

//                         {/* Правая панель */}
//                         <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
//                             <div className="game-info" style={{ marginTop: 0 }}>
//                                 <div className="list-item">
//                                     <span>Статус:</span>
//                                     <button className="button-status">{gameStatus}</button>
//                                 </div>
//                                 <div className="list-item">
//                                     <span>Оценка Stockfish:</span>
//                                     <span className="reiting">{evaluation}</span>
//                                 </div>
//                             </div>

//                             <div className="moves_panel_chess" style={{ padding: '20px', overflowY: 'auto' }}>
//                                 <div className="account-title" style={{ marginBottom: '12px' }}>История ходов</div>
//                                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '14px' }}>
//                                     {moveHistory.map((move, index) => (
//                                         index % 2 === 0 ? (
//                                             <div key={index} style={{ color: '#ffffff', fontWeight: 600 }}>
//                                                 {Math.floor(index / 2) + 1}. {move}
//                                             </div>
//                                         ) : (
//                                             <div key={index} style={{ color: '#a0a0a0' }}>
//                                                 {move}
//                                             </div>
//                                         )
//                                     ))}
//                                 </div>
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </main>
//         </div>
//     );
// }