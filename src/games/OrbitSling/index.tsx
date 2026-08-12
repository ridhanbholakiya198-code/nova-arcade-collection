import { useEffect, useRef, useState } from 'react';
import { OrbitEngine } from './engine';
import { useStore } from '../../lib/store.tsx';
import { audio } from '../../lib/audio';
import { X, RotateCcw } from 'lucide-react';

interface OrbitSlingProps {
  onExit: () => void;
}

export function OrbitSling({ onExit }: OrbitSlingProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<OrbitEngine | null>(null);
  const { recordGameScore } = useStore();
  
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    // Initialize Web Audio context on first mount
    audio.init();

    const engine = new OrbitEngine(canvasRef.current, {
      onScoreUpdate: (s) => setScore(s),
      onGameOver: (finalScore) => {
        setGameOver(true);
        recordGameScore('orbit_sling', finalScore);
      },
      onTetherPlay: () => audio.playTether(),
      onLaunchPlay: () => audio.playLaunch(),
      onCrashPlay: () => audio.playCrash(),
    });
    
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, []); // Run once

  const handleStart = () => {
    audio.init(); // ensure audio is ready
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
    <div className="fixed inset-0 bg-black z-50 overflow-hidden font-sans touch-none">
      <canvas 
        ref={canvasRef} 
        className="block w-full h-full"
      />
      
      {/* HUD Overlay */}
      <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start pointer-events-none">
        <div className="pointer-events-auto">
          <button 
            onClick={onExit}
            className="w-12 h-12 bg-zinc-900/50 backdrop-blur border border-zinc-800 rounded-full flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        <div className="text-right">
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-1">ALTITUDE</p>
          <p className="text-4xl font-display text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">
            {score}
          </p>
        </div>
      </div>

      {/* Intro Overlay */}
      {!hasStarted && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center pointer-events-auto z-10">
          <h1 className="text-6xl font-display text-amber-500 mb-4 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">Orbit Sling</h1>
          <p className="text-zinc-300 text-lg mb-12 max-w-sm text-center">Tap and hold to tether to anchors. Build momentum and climb the void.</p>
          <button 
            onClick={handleStart}
            className="px-8 py-4 bg-amber-500 text-black font-display text-2xl rounded-full hover:bg-amber-400 transition-colors active:scale-95"
          >
            START
          </button>
        </div>
      )}

      {/* Game Over Overlay */}
      {gameOver && (
        <div className="absolute inset-0 bg-red-950/80 backdrop-blur-md flex flex-col items-center justify-center pointer-events-auto z-20">
          <p className="text-red-400 font-bold tracking-[0.3em] uppercase mb-2">Signal Lost</p>
          <h2 className="text-5xl font-display text-white mb-8">Altitude: {score}</h2>
          
          <div className="flex gap-4">
            <button 
              onClick={handleRestart}
              className="px-8 py-4 bg-white text-black font-display text-xl rounded-full flex items-center gap-2 hover:bg-zinc-200 transition-colors active:scale-95"
            >
              <RotateCcw size={20} />
              RETRY
            </button>
            <button 
              onClick={onExit}
              className="px-8 py-4 bg-zinc-800 text-white font-display text-xl rounded-full hover:bg-zinc-700 transition-colors active:scale-95"
            >
              HUB
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
