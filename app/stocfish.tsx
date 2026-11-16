'use client';

import { useEffect, useRef, useState } from 'react';

export default function ChessEngine() {
  const workerRef = useRef<Worker | null>(null);
  const [bestMove, setBestMove] = useState<string>('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Инициализируем Web Worker со Stockfish
    const stockfishWorker = new Worker('/stockfish.js'); // Файл Stockfish из папки public
    workerRef.current = stockfishWorker;

    stockfishWorker.onmessage = (event) => {
      const line = event.data;

      if (line === 'readyok') {
        setIsReady(true);
      }

      // Перехватываем результат анализа
      if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        setBestMove(move);
      }
    };

    // Старт UCI-протокола
    stockfishWorker.postMessage('uci');
    stockfishWorker.postMessage('isready');

    return () => {
      stockfishWorker.terminate();
    };
  }, []);

  const analyzePosition = (fen: string) => {
    if (!workerRef.current) return;
    
    // Отправляем FEN-позицию и команду поиска на глубину 15
    workerRef.current.postMessage(`position fen ${fen}`);
    workerRef.current.postMessage('go depth 15');
  };

  return (
    <div className="p-4 border rounded-md">
      <h3 className="font-bold mb-2">Stockfish Engine (Wasm)</h3>
      <p>Статус: {isReady ? 'Готов к работе' : 'Загрузка...'}</p>
      
      <button
        onClick={() => analyzePosition('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1')}
        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
        disabled={!isReady}
      >
        Проанализировать e4
      </button>

      {bestMove && <p className="mt-2">Лучший ход: <strong>{bestMove}</strong></p>}
    </div>
  );
}