import { useCallback, useEffect, useRef, useState } from 'react';
import { OrbitEngine } from './engine';
import { useStore } from '../../lib/store.tsx';
import { audio } from '../../lib/audio';
import { X, RotateCcw } from 'lucide-react';

interface OrbitSlingProps { onExit: () => void; }

export function OrbitSling({ onExit }: OrbitSlingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrbitEngine | null>(null);
  const { recordGameScore, startGameSession, endGameSession } = useStore();
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  const stopEngine = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
  }, []);

  const createEngine = useCallback(() => {
    if (!canvasRef.current) return;
    const engine = new OrbitEngine(canvasRef.current, {
      onScoreUpdate: (s) => {
        setScore(s);
        audio.playScore(Math.min(20, s));
      },
      onGameOver: (finalScore) => {
        engine.stop();
        engineRef.current = null;
        setGameOver(true);
        recordGameScore('orbit_sling', finalScore);
        audio.playGameOver();
        endGameSession('orbit_sling');
      },
      onTetherPlay: () => audio.playTether(),
      onLaunchPlay: () => audio.playLaunch(),
      onCrashPlay: () => audio.playCrash(),
    });
    engineRef.current = engine;
  }, [recordGameScore, endGameSession]);

  useEffect(() => {
    audio.init();
    createEngine();
    return () => {
      stopEngine();
      endGameSession('orbit_sling');
    };
  }, [createEngine, stopEngine, endGameSession]);

  const handleStart = () => {
    audio.init();
    audio.playStart();
    startGameSession('orbit_sling');
    setHasStarted(true);
    engineRef.current?.start();
  };

  const handleRestart = () => {
    stopEngine();
    setScore(0);
    setGameOver(false);
    setHasStarted(true);
    startGameSession('orbit_sling');
    createEngine();
    engineRef.current?.start();
  };

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden font-sans touch-none select-none">
      <canvas ref={canvasRef} className="block w-full h-full" />

      <div className="absolute top-0 left-0 w-full p-5 md:p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <button onClick={onExit} aria-label="Exit game" className="w-12 h-12 bg-zinc-950/70 backdrop-blur border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors">
            <X size={22} />
          </button>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] mb-1">ALTITUDE</p>
          <p className="text-4xl font-display text-white">{score}</p>
        </div>
      </div>

      {!hasStarted && !gameOver && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-10 p-6 text-center">
          <h1 className="text-5xl md:text-6xl font-display text-amber-500 mb-4">Orbit Sling</h1>
          <p className="text-zinc-300 text-lg mb-10 max-w-sm">Tap and hold to tether to anchors. Build momentum and climb the void.</p>
          <button onClick={handleStart} className="px-10 py-4 bg-amber-500 text-black font-display text-2xl rounded-full active:scale-95">START</button>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 bg-black/92 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-20 p-6 text-center">
          <p className="text-zinc-500 font-bold tracking-[0.3em] uppercase mb-2">Signal Lost</p>
          <h2 className="text-5xl font-display text-white mb-8">Altitude: {score}</h2>
          <div className="flex gap-3">
            <button onClick={handleRestart} className="px-7 py-4 bg-white text-black font-display text-xl rounded-full flex items-center gap-2 active:scale-95">
              <RotateCcw size={20} /> RETRY
            </button>
            <button onClick={onExit} className="px-7 py-4 bg-zinc-900 border border-zinc-800 text-white font-display text-xl rounded-full active:scale-95">HUB</button>
          </div>
        </div>
      )}
    </div>
  );
}
