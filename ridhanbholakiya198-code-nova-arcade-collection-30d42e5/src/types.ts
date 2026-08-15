export interface GameStats {
  highScore: number;
  playCount: number;
  timePlayed: number;
}

export interface PlayerProfile {
  xp: number;
  level: number;
  gamesStats: Record<string, GameStats>;
  totalTimePlayed: number;
}

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  color: string;
  accent: string;
  accentHex: string;
  unlockLevel: number;
  tags: string[];
}

const addedGames: GameDefinition[] = [
  { id: 'gravity_flip', title: 'Gravity Flip', description: 'Tap to flip gravity and dodge the incoming barriers.', color: 'from-pink-500 to-rose-600', accent: 'bg-pink-500', accentHex: '#ec4899', unlockLevel: 1, tags: ['Reflex', 'Endless'] },
  { id: 'neon_snake', title: 'Neon Snake Rewired', description: 'Portals + power orbs.', color: 'from-cyan-400 to-blue-600', accent: 'bg-cyan-400', accentHex: '#22d3ee', unlockLevel: 1, tags: ['Arcade', 'Reflex'] },
  { id: 'color_match', title: 'Color Match Rush', description: 'Chain the colors fast.', color: 'from-orange-400 to-pink-600', accent: 'bg-orange-400', accentHex: '#fb923c', unlockLevel: 1, tags: ['Reaction', 'Speed'] },
  { id: 'sky_hopper', title: 'Sky Hopper', description: 'Climb as high as you can.', color: 'from-yellow-300 to-orange-500', accent: 'bg-yellow-300', accentHex: '#fde047', unlockLevel: 1, tags: ['Platformer', 'Endless'] },
  { id: 'tower_balance', title: 'Tower Balance', description: 'Stack it high, stay steady.', color: 'from-amber-300 to-yellow-600', accent: 'bg-amber-300', accentHex: '#fcd34d', unlockLevel: 1, tags: ['Timing', 'Precision'] },
  { id: 'pixel_racer', title: 'Pixel Racer', description: 'Dodge lanes at top speed.', color: 'from-violet-400 to-fuchsia-600', accent: 'bg-violet-400', accentHex: '#a78bfa', unlockLevel: 1, tags: ['Racing', 'Reflex'] },
  { id: 'memory_duel', title: 'Memory Flip Duel', description: 'Beat the clock, find pairs.', color: 'from-emerald-300 to-teal-600', accent: 'bg-emerald-300', accentHex: '#6ee7b7', unlockLevel: 1, tags: ['Memory', 'Puzzle'] },
];

const existingGames: GameDefinition[] = [
  { id: 'orbit_sling', title: 'Orbit Sling', description: 'Master orbital momentum. Tap to tether, release to launch higher into the void.', color: 'from-amber-500 to-orange-600', accent: 'bg-amber-500', accentHex: '#f59e0b', unlockLevel: 1, tags: ['Physics', 'Reflex', 'Endless'] },
  { id: 'neon_drift', title: 'Neon Drift', description: 'Navigate a procedurally shifting corridor of light. Precision is everything.', color: 'from-cyan-400 to-blue-600', accent: 'bg-cyan-400', accentHex: '#22d3ee', unlockLevel: 1, tags: ['Precision', 'Pacing'] },
  { id: 'pulse_grid', title: 'Pulse Grid', description: 'Clear nodes in rhythm to the heartbeat. A mix of spatial awareness and timing.', color: 'from-rose-500 to-purple-600', accent: 'bg-rose-500', accentHex: '#f43f5e', unlockLevel: 1, tags: ['Rhythm', 'Puzzle'] },
  { id: 'void_runner', title: 'Void Runner', description: 'Gravity shifts on every jump. Think three steps ahead to survive.', color: 'from-emerald-400 to-teal-700', accent: 'bg-emerald-400', accentHex: '#34d399', unlockLevel: 1, tags: ['Platformer', 'Logic'] },
  { id: 'echo_blade', title: 'Echo Blade', description: 'Deflect incoming hazards using a sweeping directional shield.', color: 'from-zinc-400 to-zinc-700', accent: 'bg-zinc-300', accentHex: '#d4d4d8', unlockLevel: 1, tags: ['Action'] },
  { id: 'hex_collapse', title: 'Hex Collapse', description: 'The floor is falling away. Chain jumps across unstable hexagonal tiles.', color: 'from-indigo-500 to-violet-700', accent: 'bg-indigo-400', accentHex: '#818cf8', unlockLevel: 1, tags: ['Survival'] },
  { id: 'chrono_shift', title: 'Chrono Shift', description: 'Time moves only when you drag. Thread the needle through impossible gaps.', color: 'from-yellow-400 to-amber-600', accent: 'bg-yellow-400', accentHex: '#facc15', unlockLevel: 1, tags: ['Time', 'Puzzle'] },
  { id: 'split_stream', title: 'Split Stream', description: 'Control two entities simultaneously on parallel tracks.', color: 'from-fuchsia-500 to-pink-700', accent: 'bg-fuchsia-400', accentHex: '#e879f9', unlockLevel: 1, tags: ['Multitasking'] },
  { id: 'quantum_link', title: 'Quantum Link', description: 'Connect matching nodes without crossing your own energy trails.', color: 'from-blue-400 to-indigo-600', accent: 'bg-blue-400', accentHex: '#60a5fa', unlockLevel: 1, tags: ['Logic'] },
  { id: 'shadow_step', title: 'Shadow Step', description: 'Memorize the safe path in the light, then navigate it in total darkness.', color: 'from-slate-600 to-slate-900', accent: 'bg-slate-400', accentHex: '#94a3b8', unlockLevel: 1, tags: ['Memory'] },
  { id: 'tether_ball', title: 'Tether Ball', description: 'A minimalist physics game of wrapping a tether around a central peg.', color: 'from-sky-400 to-blue-600', accent: 'bg-sky-400', accentHex: '#38bdf8', unlockLevel: 1, tags: ['Physics'] },
  { id: 'nova_core', title: 'Nova Core', description: 'The ultimate challenge. Elements of the arcade combined.', color: 'from-purple-500 to-fuchsia-700', accent: 'bg-purple-400', accentHex: '#c084fc', unlockLevel: 1, tags: ['Mastery'] },
];

export const GAMES: GameDefinition[] = [...addedGames, ...existingGames];
