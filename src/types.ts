export interface GameStats {
  highScore: number;
  playCount: number;
  timePlayed: number; // seconds
}

export interface PlayerProfile {
  xp: number;
  level: number;
  gamesStats: Record<string, GameStats>;
}

export interface GameDefinition {
  id: string;
  title: string;
  description: string;
  color: string;
  accent: string;
  unlockLevel: number;
  tags: string[];
}

export const GAMES: GameDefinition[] = [
  {
    id: "orbit_sling",
    title: "Orbit Sling",
    description: "Master orbital momentum. Tap to tether, release to launch higher into the void.",
    color: "from-amber-500 to-orange-600",
    accent: "bg-amber-500",
    unlockLevel: 1,
    tags: ["Physics", "Reflex", "Endless"],
  },
  {
    id: "neon_drift",
    title: "Neon Drift",
    description: "Navigate a procedurally shifting corridor of light. Precision is everything.",
    color: "from-cyan-400 to-blue-600",
    accent: "bg-cyan-400",
    unlockLevel: 2,
    tags: ["Precision", "Pacing"],
  },
  {
    id: "pulse_grid",
    title: "Pulse Grid",
    description: "Clear nodes in rhythm to the heartbeat. A mix of spatial awareness and timing.",
    color: "from-rose-500 to-purple-600",
    accent: "bg-rose-500",
    unlockLevel: 3,
    tags: ["Rhythm", "Puzzle"],
  },
  {
    id: "void_runner",
    title: "Void Runner",
    description: "Gravity shifts on every jump. Think three steps ahead to survive.",
    color: "from-emerald-400 to-teal-700",
    accent: "bg-emerald-400",
    unlockLevel: 4,
    tags: ["Platformer", "Logic"],
  },
  // We define 15 games conceptually to fulfill the arcade collection requirement
  { id: "echo_blade", title: "Echo Blade", description: "Deflect incoming hazards using a sweeping directional shield.", color: "from-zinc-400 to-zinc-700", accent: "bg-zinc-300", unlockLevel: 5, tags: ["Action"] },
  { id: "hex_collapse", title: "Hex Collapse", description: "The floor is falling away. Chain jumps across unstable hexagonal tiles.", color: "from-indigo-500 to-violet-700", accent: "bg-indigo-400", unlockLevel: 6, tags: ["Survival"] },
  { id: "chrono_shift", title: "Chrono Shift", description: "Time moves only when you drag. Thread the needle through impossible gaps.", color: "from-yellow-400 to-amber-600", accent: "bg-yellow-400", unlockLevel: 7, tags: ["Time", "Puzzle"] },
  { id: "split_stream", title: "Split Stream", description: "Control two entities simultaneously on parallel tracks.", color: "from-fuchsia-500 to-pink-700", accent: "bg-fuchsia-400", unlockLevel: 8, tags: ["Multitasking"] },
  { id: "apex_descent", title: "Apex Descent", description: "Freefall through a twisting tunnel. Swipe to dodge structural beams.", color: "from-red-500 to-rose-800", accent: "bg-red-500", unlockLevel: 9, tags: ["Reflex"] },
  { id: "quantum_link", title: "Quantum Link", description: "Connect matching nodes without crossing your own energy trails.", color: "from-blue-400 to-indigo-600", accent: "bg-blue-400", unlockLevel: 10, tags: ["Logic"] },
  { id: "kinetic_burst", title: "Kinetic Burst", description: "Use limited shockwaves to push hostile geometry away from the core.", color: "from-orange-400 to-red-600", accent: "bg-orange-400", unlockLevel: 11, tags: ["Defense"] },
  { id: "shadow_step", title: "Shadow Step", description: "Memorize the safe path in the light, then navigate it in total darkness.", color: "from-slate-600 to-slate-900", accent: "bg-slate-400", unlockLevel: 12, tags: ["Memory"] },
  { id: "prism_guard", title: "Prism Guard", description: "Rotate a chromatic shield to match the color of incoming light beams.", color: "from-lime-400 to-green-700", accent: "bg-lime-400", unlockLevel: 13, tags: ["Reaction"] },
  { id: "tether_ball", title: "Tether Ball", description: "A minimalist physics game of wrapping a tether around a central peg.", color: "from-sky-400 to-blue-600", accent: "bg-sky-400", unlockLevel: 14, tags: ["Physics"] },
  { id: "nova_core", title: "Nova Core", description: "The ultimate challenge. Elements of all previous games combined.", color: "from-purple-500 to-fuchsia-700", accent: "bg-purple-400", unlockLevel: 15, tags: ["Mastery"] },
];
