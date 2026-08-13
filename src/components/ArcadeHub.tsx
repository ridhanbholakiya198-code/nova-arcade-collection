import { motion } from 'motion/react';
import { GAMES, GameDefinition } from '../types';
import { useStore } from '../lib/store.tsx';
import { Play, Lock, Trophy, Gamepad2, ChevronRight } from 'lucide-react';

interface ArcadeHubProps {
  onLaunchGame: (gameId: string) => void;
}

export function ArcadeHub({ onLaunchGame }: ArcadeHubProps) {
  const { profile } = useStore();

  const xpForNextLevel = Math.pow(profile.level, 2) * 100;
  const xpForCurrentLevel = Math.pow(profile.level - 1, 2) * 100;
  const progress = Math.max(0, Math.min(100, ((profile.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)) * 100));

  return (
    <div className="min-h-screen bg-black flex flex-col font-sans">
      {/* Header Profile Section */}
      <header className="px-6 py-8 md:px-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-white mb-2">NOVA ARCADE</h1>
          <p className="text-zinc-400 text-sm md:text-base">15 Premium Touch-First Experiences</p>
        </div>
        
        <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 min-w-[280px] backdrop-blur-xl">
          <div className="flex justify-between items-end mb-2">
            <div>
              <p className="text-xs text-zinc-500 font-bold tracking-wider uppercase mb-1">Arcade Mastery</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-display text-amber-400">LVL {profile.level}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-zinc-400 font-mono">{profile.xp} XP</span>
            </div>
          </div>
          <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-amber-500"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
        </div>
      </header>

      {/* Game Selection */}
      <main className="flex-1 px-6 md:px-12 pb-12 overflow-hidden flex flex-col">
        <h2 className="text-xl font-display text-zinc-300 mb-6 flex items-center gap-2">
          <Gamepad2 size={24} className="text-amber-500" />
          Cabinet Selection
        </h2>
        
        {/* Horizontal Scroll Snap Container */}
        <div className="flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory flex gap-6 pb-8 items-center">
          {GAMES.map((game, index) => {
            const isUnlocked = true; // For testing/dev, everything is unlocked
            const stats = profile.gamesStats[game.id];
            
            return (
              <motion.div
                key={game.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`snap-center shrink-0 w-[85vw] md:w-[400px] h-[500px] rounded-3xl overflow-hidden relative group border ${isUnlocked ? 'border-zinc-700 bg-zinc-900' : 'border-zinc-800/50 bg-zinc-900/30'}`}
              >
                {/* Background Gradient */}
                {isUnlocked && (
                  <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${game.color}`} />
                )}
                
                <div className="absolute inset-0 p-8 flex flex-col">
                  {/* Tags */}
                  <div className="flex gap-2 mb-4">
                    {game.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 rounded-full bg-zinc-900/50 text-[10px] uppercase font-bold tracking-wider text-zinc-400 border border-zinc-800">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <h3 className={`font-display text-4xl mb-3 ${isUnlocked ? 'text-white' : 'text-zinc-600'}`}>
                    {game.title}
                  </h3>
                  <p className={`text-sm leading-relaxed ${isUnlocked ? 'text-zinc-300' : 'text-zinc-700'}`}>
                    {game.description}
                  </p>

                  <div className="mt-auto">
                    {isUnlocked ? (
                      <div className="space-y-6">
                        {/* Stats */}
                        <div className="bg-zinc-900/50 rounded-xl p-4 border border-zinc-800 flex justify-between items-center backdrop-blur-sm">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${game.accent} bg-opacity-20`}>
                              <Trophy size={18} className={`text-opacity-100 ${game.accent.replace('bg-', 'text-')}`} />
                            </div>
                            <div>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Best Score</p>
                              <p className="font-mono text-xl text-zinc-200">{stats?.highScore || 0}</p>
                            </div>
                          </div>
                        </div>

                        {/* Play Button */}
                        <button
                          onClick={() => onLaunchGame(game.id)}
                          className={`w-full py-4 rounded-xl flex items-center justify-center gap-2 font-display text-lg tracking-wide transition-all ${game.accent} hover:brightness-110 active:scale-95 text-zinc-950`}
                        >
                          <Play fill="currentColor" size={20} />
                          INSERT COIN
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 bg-zinc-900/40 rounded-xl border border-zinc-800/50 border-dashed">
                        <Lock size={32} className="text-zinc-700 mb-3" />
                        <p className="text-sm font-bold text-zinc-600 uppercase tracking-widest">
                          Unlocks at Level {game.unlockLevel}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          
          {/* Padding element for scroll area */}
          <div className="shrink-0 w-6" />
        </div>
      </main>
    </div>
  );
}
