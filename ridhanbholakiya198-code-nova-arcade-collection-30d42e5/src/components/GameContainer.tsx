import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../lib/store';
import { audio } from '../lib/audio';
import { Gamepad2, RotateCcw, Trophy, X } from 'lucide-react';

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

export function GameContainer({
  gameId,
  title,
  description,
  accentColor,
  EngineClass,
  onExit,
  scoreLabel = 'SCORE',
}: GameContainerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const { profile, recordGameScore, startGameSession, endGameSession } = useStore();

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const previousLevelRef = useRef(profile.level);
  const scoreRef = useRef(0);
  const gameEndedRef = useRef(false);

  const stopCurrentEngine = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
  }, []);

  const createEngine = useCallback(() => {
    if (!canvasRef.current) return null;

    gameEndedRef.current = false;
    const engine = new EngineClass(canvasRef.current, {
      onScoreUpdate: (nextScore) => {
        const increased = nextScore > scoreRef.current;
        scoreRef.current = nextScore;
        setScore(nextScore);
        if (increased) audio.playScore(Math.min(20, nextScore));
      },
      onGameOver: (finalScore) => {
        if (gameEndedRef.current) return;
        gameEndedRef.current = true;
        // Stop the loop BEFORE showing the result overlay. This is the
        // central lifecycle guard for every canvas game in the collection.
        engine.stop();
        engineRef.current = null;
        setGameOver(true);
        recordGameScore(gameId, finalScore);
        audio.playGameOver();
        endGameSession(gameId);
      },
      playTone: (f, t, d, v, s) => audio.playTone(f, t, d, v, s),
    });

    engineRef.current = engine;
    return engine;
  }, [EngineClass, gameId, recordGameScore, endGameSession]);

  useEffect(() => {
    audio.init();
    scoreRef.current = 0;
    gameEndedRef.current = false;
    setScore(0);
    setGameOver(false);
    setHasStarted(false);

    createEngine();

    return () => {
      stopCurrentEngine();
      endGameSession(gameId);
    };
  }, [createEngine, stopCurrentEngine, endGameSession, gameId]);

  useEffect(() => {
    if (profile.level > previousLevelRef.current) {
      audio.playLevelUp();
    }
    previousLevelRef.current = profile.level;
  }, [profile.level]);

  const handleStart = () => {
    audio.init();
    audio.playStart();
    startGameSession(gameId);
    setHasStarted(true);
    engineRef.current?.start();
  };

  const handleRestart = () => {
    stopCurrentEngine();
    gameEndedRef.current = false;
    scoreRef.current = 0;
    setScore(0);
    setGameOver(false);
    setHasStarted(true);
    startGameSession(gameId);
    const engine = createEngine();
    engine?.start();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden font-sans touch-none select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      <div className="absolute top-0 left-0 w-full p-5 md:p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <button
            aria-label="Exit game"
            onClick={onExit}
            className="w-12 h-12 bg-zinc-950/70 backdrop-blur border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={22} />
          </button>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1">{scoreLabel}</p>
          <p className="text-4xl font-display text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">{score}</p>
        </div>
      </div>

      {!hasStarted && !gameOver && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-10 p-6 text-center">
          <div className="w-14 h-14 rounded-2xl border border-zinc-800 bg-zinc-950 flex items-center justify-center mb-5" style={{ color: accentColor }}>
            <Gamepad2 size={26} />
          </div>
          <h1 className="text-5xl md:text-6xl font-display mb-4" style={{ color: accentColor }}>{title}</h1>
          <p className="text-zinc-300 text-lg mb-10 max-w-md">{description}</p>
          <button
            onClick={handleStart}
            className="px-10 py-4 text-black font-display text-2xl rounded-full transition-transform active:scale-95"
            style={{ backgroundColor: accentColor }}
          >
            START
          </button>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-20 p-6 text-center">
          <Trophy size={28} className="text-zinc-600 mb-4" />
          <p className="text-zinc-500 font-bold tracking-[0.3em] uppercase mb-2">Game Over</p>
          <h2 className="text-5xl font-display text-white mb-3">{scoreLabel}: {score}</h2>
          <p className="text-zinc-500 mb-8 text-sm">Your run has been stopped.</p>

          <div className="flex gap-3">
            <button onClick={handleRestart} className="px-7 py-4 bg-white text-black font-display text-xl rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-colors active:scale-95">
              <RotateCcw size={20} /> RETRY
            </button>
            <button onClick={onExit} className="px-7 py-4 bg-zinc-900 border border-zinc-800 text-white font-display text-xl rounded-full hover:bg-zinc-800 transition-colors active:scale-95">
              HUB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
