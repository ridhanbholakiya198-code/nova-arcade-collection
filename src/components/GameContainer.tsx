import { useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { audio } from '../lib/audio';
import { X, RotateCcw } from 'lucide-react';

export interface GameEngineCallbacks {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  playTone: (freq: number, type: OscillatorType, duration: number, vol?: number, slideToFreq?: number) => void;
}

export interface GameEngine {
  start: () => void;
  stop: () => void;
  reset: () => void;
}

export type EngineConstructor = new (canvas: HTMLCanvasElement, callbacks: GameEngineCallbacks) => GameEngine;

interface GameContainerProps {
  gameId: string;
  title: string;
  description: string;
  accentColor: string;
  EngineClass: EngineConstructor;
  onExit: () => void;
  scoreLabel?: string;
}

export function GameContainer({ gameId, title, description, accentColor, EngineClass, onExit, scoreLabel = "SCORE" }: GameContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { recordGameScore } = useStore();
  
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    audio.init();

    const engine = new EngineClass(canvasRef.current, {
      onScoreUpdate: (s) => setScore(s),
      onGameOver: (finalScore) => {
        setGameOver(true);
        recordGameScore(gameId, finalScore);
      },
      playTone: (f, t, d, v, s) => audio.playTone(f, t, d, v, s),
    });
    
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, [EngineClass, gameId, recordGameScore]);

  const handleStart = () => {
    audio.init();
    setHasStarted(true);
  };

  const handleRestart = () => {
    setGameOver(false);
    setScore(0);
    if (engineRef.current) {
      engineRef.current.reset();
    }
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden font-sans touch-none select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />
      
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <button onClick={onExit} className="w-12 h-12 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-1">{scoreLabel}</p>
          <p className="text-4xl font-display text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{score}</p>
        </div>
      </div>

      {/* Intro Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-10 p-6 text-center">
          <h1 className={`text-5xl md:text-6xl font-display mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]`} style={{ color: accentColor }}>{title}</h1>
          <p className="text-zinc-300 text-lg mb-12 max-w-md">{description}</p>
          <button 
            onClick={handleStart}
            className="px-10 py-4 text-black font-display text-2xl rounded-full transition-transform active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            START
          </button>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-zinc-950/90 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-20">
          <p className="text-zinc-400 font-bold tracking-[0.3em] uppercase mb-2">Game Over</p>
          <h2 className="text-5xl font-display text-white mb-8">{scoreLabel}: {score}</h2>
          
          <div className="flex gap-4">
            <button onClick={handleRestart} className="px-8 py-4 bg-white text-black font-display text-xl rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-colors active:scale-95">
              <RotateCcw size={20} /> RETRY
            </button>
            <button onClick={onExit} className="px-8 py-4 bg-zinc-800 text-white font-display text-xl rounded-full hover:bg-zinc-700 transition-colors active:scale-95">
              HUB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
