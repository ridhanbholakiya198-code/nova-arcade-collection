import { motion, AnimatePresence } from 'motion/react';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { GAMES, GameDefinition } from '../types';
import { useStore } from '../lib/store.tsx';
import { audio } from '../lib/audio';
import { APP_VERSION, checkForUpdate, type VersionCheckResult } from '../lib/version';
import {
  Play, Trophy, Gamepad2, Github, Clock3, Info, Palette,
  ChevronRight, Shield, FileText, X, MoreVertical, Zap,
  Wind, Layers, Car, Brain, Orbit, Sparkles, Timer, CircleDot,
  Crosshair, Boxes, Waypoints, Gauge, Moon, Sun, Shuffle, Target, Hexagon,
  Tag, CheckCircle2, ArrowUpCircle, RefreshCw, AlertCircle,
  type LucideIcon
} from 'lucide-react';

interface ArcadeHubProps {
  onLaunchGame: (gameId: string) => void;
}

function formatTime(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const GAME_ICONS: Record<string, LucideIcon> = {
  gravity_flip: Zap,
  neon_snake: Waypoints,
  color_match: Palette,
  sky_hopper: Wind,
  tower_balance: Layers,
  pixel_racer: Car,
  memory_duel: Brain,
  orbit_sling: Orbit,
  neon_drift: Gauge,
  pulse_grid: CircleDot,
  void_runner: Shuffle,
  echo_blade: Crosshair,
  hex_collapse: Hexagon,
  chrono_shift: Timer,
  split_stream: Boxes,
  quantum_link: Waypoints,
  shadow_step: Moon,
  tether_ball: Target,
  nova_core: Sparkles,
};

function MenuRow({
  icon,
  label,
  onClick,
  right,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  right?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="nova-menu-row w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-left text-zinc-200 hover:bg-white/[0.06] active:bg-white/[0.09] transition-colors"
    >
      <span className="text-zinc-400">{icon}</span>
      <span className="flex-1 text-sm font-medium">{label}</span>
      {right}
    </button>
  );
}

function InfoPanel({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-end p-4 md:p-6 bg-black/40 backdrop-blur-[2px]">
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        className="w-full max-w-md max-h-[calc(100vh-2rem)] overflow-auto bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl"
      >
        <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-5 py-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-white">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/[0.06]">
            <X size={18} />
          </button>
        </div>
        <div className="p-5 text-sm leading-6 text-zinc-400">{children}</div>
      </motion.div>
    </div>
  );
}

export function ArcadeHub({ onLaunchGame }: ArcadeHubProps) {
  const { profile, totalTimePlayed } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [subMenu, setSubMenu] = useState<'about' | null>(null);
  const [panel, setPanel] = useState<'time' | 'terms' | 'privacy' | 'version' | null>(null);
  const [appearance, setAppearance] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('nova_arcade_appearance');
    return saved === 'light' || saved === 'dim' ? 'light' : 'dark';
  });
  const [versionCheck, setVersionCheck] = useState<VersionCheckResult | null>(null);
  const [checkingVersion, setCheckingVersion] = useState(false);

  const runVersionCheck = () => {
    setCheckingVersion(true);
    checkForUpdate().then(result => {
      setVersionCheck(result);
      setCheckingVersion(false);
    });
  };

  // Silent background check on load so the amber "update available" dot in
  // the menu shows up without the person needing to open the panel first.
  useEffect(() => {
    runVersionCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Soft "cartridge menu" scroll tick while swiping through the games row —
  // fires once per card the carousel snaps to, not on every scroll pixel.
  const gamesRowRef = useRef<HTMLDivElement>(null);
  const activeCardIndexRef = useRef(0);
  const scrollRafRef = useRef<number | null>(null);
  const handleGamesScroll = () => {
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const row = gamesRowRef.current;
      if (!row) return;
      const rowRect = row.getBoundingClientRect();
      const centerX = rowRect.left + rowRect.width / 2;
      let closestIdx = 0;
      let closestDist = Infinity;
      Array.from(row.children).forEach((child, idx) => {
        if (!(child as HTMLElement).dataset.gameCard) return;
        const rect = (child as HTMLElement).getBoundingClientRect();
        const dist = Math.abs(rect.left + rect.width / 2 - centerX);
        if (dist < closestDist) {
          closestDist = dist;
          closestIdx = idx;
        }
      });
      if (closestIdx !== activeCardIndexRef.current) {
        activeCardIndexRef.current = closestIdx;
        audio.init();
        audio.playScroll();
      }
    });
  };

  useEffect(() => {
    document.documentElement.dataset.appearance = appearance;
    localStorage.setItem('nova_arcade_appearance', appearance);
  }, [appearance]);

  useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSubMenu(null);
      }
    };
    const closeOnPointer = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-arcade-menu]')) {
        setMenuOpen(false);
        setSubMenu(null);
      }
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOnPointer);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      document.removeEventListener('pointerdown', closeOnPointer);
    };
  }, [menuOpen]);

  const xpForNextLevel = Math.pow(profile.level, 2) * 100;
  const xpForCurrentLevel = Math.pow(profile.level - 1, 2) * 100;
  const progress = Math.max(0, Math.min(100, ((profile.xp - xpForCurrentLevel) / Math.max(1, xpForNextLevel - xpForCurrentLevel)) * 100));

  const toggleAppearance = () => {
    audio.init();
    audio.playClick();
    setAppearance(v => v === 'dark' ? 'light' : 'dark');
  };

  const launch = (game: GameDefinition) => {
    audio.init();
    audio.playClick();
    onLaunchGame(game.id);
  };

  return (
    <div className="nova-hub min-h-screen bg-black text-white flex flex-col font-sans">
      <header className="px-5 pt-5 pb-6 md:px-10 md:pt-8 flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" />
            <span className="text-[10px] uppercase tracking-[0.28em] text-zinc-500 font-bold">NOVA ARCADE</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight text-white">Arcade Collection</h1>
          <p className="text-zinc-500 text-sm mt-2">19 touch-first games · offline ready</p>
        </div>

        <div className="relative" data-arcade-menu>
          <button
            aria-label="Open menu"
            onClick={() => { audio.init(); audio.playClick(); setMenuOpen(v => !v); setSubMenu(null); }}
            className="nova-menu-trigger w-11 h-11 rounded-full border border-zinc-800 bg-zinc-950/90 text-zinc-300 flex items-center justify-center hover:border-zinc-700 hover:text-white transition-colors"
          >
            <MoreVertical size={20} />
          </button>

          <AnimatePresence>
            {menuOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: .98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: .98 }}
                className="nova-menu-panel absolute right-0 top-14 z-50 w-[min(15rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] p-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl overflow-visible"
              >
                <MenuRow
                  icon={<Github size={17} />}
                  label="GitHub"
                  onClick={() => window.open('https://github.com/ridhanbholakiya198-code/nova-arcade-collection', '_blank', 'noopener,noreferrer')}
                  right={<span className="text-zinc-600">↗</span>}
                />
                <MenuRow
                  icon={<Clock3 size={17} />}
                  label="Played Time"
                  onClick={() => { setPanel('time'); setMenuOpen(false); }}
                  right={<span className="text-[10px] text-zinc-600">{formatTime(totalTimePlayed)}</span>}
                />
                <MenuRow
                  icon={<Info size={17} />}
                  label="About"
                  onClick={() => setSubMenu(v => v === 'about' ? null : 'about')}
                  right={<ChevronRight size={16} className={subMenu ? 'rotate-180 transition-transform' : ''} />}
                />
                <MenuRow
                  icon={<Palette size={17} />}
                  label="Appearance"
                  onClick={toggleAppearance}
                  right={<span className="nova-appearance-toggle" aria-label={appearance === 'dark' ? 'Switch to light theme' : 'Switch to dark AMOLED theme'}><span className="nova-appearance-thumb">{appearance === 'dark' ? <Moon size={13} /> : <Sun size={13} />}</span></span>}
                />
                <MenuRow
                  icon={<Tag size={17} />}
                  label="Version"
                  onClick={() => { setPanel('version'); setMenuOpen(false); }}
                  right={
                    <span className="flex items-center gap-1.5 text-[10px] text-zinc-600 font-mono">
                      v{APP_VERSION}
                      {versionCheck?.status === 'update-available' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,.8)]" />
                      )}
                    </span>
                  }
                />

                <AnimatePresence>
                  {subMenu === 'about' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, scale: .98 }}
                      animate={{ opacity: 1, height: 'auto', scale: 1 }}
                      exit={{ opacity: 0, height: 0, scale: .98 }}
                      className="nova-about-submenu w-full p-1.5 rounded-2xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-xl shadow-2xl"
                    >
                      <MenuRow icon={<FileText size={16}/>} label="Terms & Conditions" onClick={() => {setPanel('terms');setMenuOpen(false);setSubMenu(null);}} />
                      <MenuRow icon={<Shield size={16}/>} label="Privacy Policy" onClick={() => {setPanel('privacy');setMenuOpen(false);setSubMenu(null);}} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="flex-1 px-5 md:px-10 pb-10 overflow-hidden flex flex-col">
        <div className="nova-mastery-card bg-zinc-950/80 border border-zinc-900 rounded-2xl p-4 md:p-5 mb-6 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex justify-between items-end mb-2">
              <div>
                <p className="text-[10px] text-zinc-600 font-bold tracking-[0.2em] uppercase">Arcade Mastery</p>
                <span className="text-2xl font-display text-zinc-100">LVL {profile.level}</span>
              </div>
              <span className="text-xs text-zinc-500 font-mono">{profile.xp} XP</span>
            </div>
            <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
              <motion.div className="h-full bg-white" initial={{width:0}} animate={{width:`${progress}%`}} transition={{duration:.8}} />
            </div>
          </div>
          <div className="flex items-center gap-2 text-zinc-500 text-xs border-t md:border-t-0 md:border-l border-zinc-900 pt-3 md:pt-0 md:pl-5">
            <Clock3 size={15} />
            {formatTime(totalTimePlayed)} total
          </div>
        </div>

        <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500 mb-4 flex items-center gap-2">
          <Gamepad2 size={17} />
          Games
        </h2>

        <div
          ref={gamesRowRef}
          onScroll={handleGamesScroll}
          className="flex-1 overflow-x-auto no-scrollbar snap-x snap-mandatory flex gap-5 pb-6 items-center"
        >
          {GAMES.map((game, index) => {
            const stats = profile.gamesStats[game.id];
            return (
              <motion.div
                key={game.id}
                data-game-card="true"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index * .035, .5) }}
                className="nova-game-card snap-center shrink-0 w-[82vw] md:w-[380px] h-[475px] rounded-3xl overflow-hidden relative border border-zinc-800 bg-zinc-950 shadow-[0_18px_70px_rgba(0,0,0,.45)] hover:border-zinc-700 transition-colors"
              >
                <div className={`nova-card-glow absolute inset-0 opacity-[0.08] bg-gradient-to-br ${game.color}`} />
                <div className="absolute inset-0 p-7 flex flex-col">
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div
                      className="nova-icon-box w-14 h-14 rounded-2xl border border-zinc-800 bg-black/60 flex items-center justify-center shadow-inner"
                      style={{ color: game.accentHex }}
                      aria-hidden="true"
                    >
                      {(() => { const Icon = GAME_ICONS[game.id] ?? Gamepad2; return <Icon size={27} strokeWidth={1.8} />; })()}
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      {game.tags.map(tag => (
                        <span key={tag} className="nova-game-tag px-2.5 py-1 rounded-full bg-black/50 text-[9px] uppercase font-bold tracking-wider text-zinc-500 border border-zinc-800">{tag}</span>
                      ))}
                    </div>
                  </div>
                  <h3 className="font-display text-3xl md:text-4xl mb-3 text-white">{game.title}</h3>
                  <p className="text-sm leading-relaxed text-zinc-400 max-w-[30ch]">{game.description}</p>

                  <div className="mt-auto space-y-4">
                    <div className="nova-stat-box bg-black/40 rounded-xl p-4 border border-zinc-900 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center border border-zinc-800" style={{color:game.accentHex}}>
                          <Trophy size={17} />
                        </div>
                        <div>
                          <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Best Score</p>
                          <p className="font-mono text-xl text-zinc-200">{stats?.highScore || 0}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-bold">Played</p>
                        <p className="font-mono text-sm text-zinc-400">{stats?.playCount || 0}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => launch(game)}
                      className="w-full py-4 rounded-xl flex items-center justify-center gap-2 font-display text-lg tracking-wide transition-all active:scale-[.98] text-black"
                      style={{backgroundColor:game.accentHex}}
                    >
                      <Play fill="currentColor" size={18} />
                      PLAY
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          <div className="shrink-0 w-6" />
        </div>
      </main>

      {panel === 'time' && (
        <InfoPanel title="Played Time" onClose={() => setPanel(null)}>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Total App Time</p>
              <p className="text-2xl text-white font-display">{formatTime(totalTimePlayed)}</p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Games Played</p>
              <p className="text-2xl text-white font-display">{Object.values(profile.gamesStats).reduce((a, s) => a + s.playCount, 0)}</p>
            </div>
          </div>
          <div className="space-y-2">
            {GAMES.filter(g => (profile.gamesStats[g.id]?.timePlayed ?? 0) > 0).map(g => (
              <div key={g.id} className="flex justify-between py-2 border-b border-zinc-900">
                <span className="text-zinc-300">{g.title}</span>
                <span className="font-mono text-zinc-500">{formatTime(profile.gamesStats[g.id].timePlayed)}</span>
              </div>
            ))}
          </div>
        </InfoPanel>
      )}

      {panel === 'terms' && (
        <InfoPanel title="Terms & Conditions" onClose={() => setPanel(null)}>
          <p>Nova Arcade is an offline-first collection of casual games. By using the app, you agree to use it for personal entertainment and not to misuse, reverse engineer, or distribute modified copies of the application or its content.</p>
          <p className="mt-4">Scores and play statistics are stored locally on your device. The app does not require an account to play.</p>
          <p className="mt-4">These terms may be updated when the application changes. Continued use after an update means you accept the updated terms.</p>
        </InfoPanel>
      )}

      {panel === 'privacy' && (
        <InfoPanel title="Privacy Policy" onClose={() => setPanel(null)}>
          <p>Nova Arcade is designed to work offline. Game scores, XP, levels, and play-time statistics are stored locally on your device using browser/app storage.</p>
          <p className="mt-4">The app does not intentionally collect personal information, contacts, location, or advertising identifiers.</p>
          <p className="mt-4">If you open GitHub from the menu, that action leaves the app and is handled by the destination website according to its own privacy policy.</p>
        </InfoPanel>
      )}

      {panel === 'version' && (
        <InfoPanel title="Version" onClose={() => setPanel(null)}>
          <div className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 mb-4 flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-1">Installed Version</p>
              <p className="text-2xl text-white font-display font-mono">v{APP_VERSION}</p>
            </div>
            <Tag size={22} className="text-zinc-600" />
          </div>

          {checkingVersion && (
            <div className="flex items-center gap-2.5 text-zinc-400">
              <RefreshCw size={16} className="animate-spin" />
              Checking GitHub for the latest release...
            </div>
          )}

          {!checkingVersion && versionCheck?.status === 'latest' && (
            <div className="flex items-start gap-2.5 text-emerald-400">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>You're on the latest version. No update available right now.</span>
            </div>
          )}

          {!checkingVersion && versionCheck?.status === 'update-available' && (
            <div>
              <div className="flex items-start gap-2.5 text-amber-400 mb-4">
                <ArrowUpCircle size={18} className="shrink-0 mt-0.5" />
                <span>Update available: v{versionCheck.latest} (you're on v{versionCheck.current})</span>
              </div>
              <button
                onClick={() => window.open(versionCheck.url, '_blank', 'noopener,noreferrer')}
                className="w-full py-3 rounded-xl bg-amber-400 text-black font-display text-sm tracking-wide flex items-center justify-center gap-2 active:scale-[.98] transition-transform"
              >
                Get the Update <ChevronRight size={16} />
              </button>
            </div>
          )}

          {!checkingVersion && versionCheck?.status === 'error' && (
            <div className="flex items-start gap-2.5 text-zinc-500">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <span>Couldn't check for updates right now. Check your connection and try again.</span>
            </div>
          )}

          {!checkingVersion && (
            <button
              onClick={runVersionCheck}
              className="mt-4 flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <RefreshCw size={13} /> Check again
            </button>
          )}
        </InfoPanel>
      )}
    </div>
  );
}
