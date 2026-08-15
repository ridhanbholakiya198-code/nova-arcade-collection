import { Suspense, lazy, useEffect, useState } from 'react';
import { StoreProvider } from './lib/store.tsx';
import { ArcadeHub } from './components/ArcadeHub';
import { GameContainer, type EngineConstructor } from './components/GameContainer';
import { GAMES } from './types';

// Every game engine is loaded on-demand (code-split) instead of being bundled
// into the initial app payload. This is what was making the whole app feel
// sluggish before: 18+ canvas engines were being parsed & evaluated the
// moment the hub screen opened, even though only one game runs at a time.
const engineLoaders: Record<string, () => Promise<{ default: EngineConstructor }>> = {
  gravity_flip: () => import('./games/GravityFlip/engine').then(m => ({ default: m.GravityFlipEngine })),
  neon_snake: () => import('./games/NeonSnake/engine').then(m => ({ default: m.NeonSnakeEngine })),
  color_match: () => import('./games/ColorMatch/engine').then(m => ({ default: m.ColorMatchEngine })),
  sky_hopper: () => import('./games/SkyHopper/engine').then(m => ({ default: m.SkyHopperEngine })),
  tower_balance: () => import('./games/TowerBalance/engine').then(m => ({ default: m.TowerBalanceEngine })),
  pixel_racer: () => import('./games/PixelRacer/engine').then(m => ({ default: m.PixelRacerEngine })),
  memory_duel: () => import('./games/MemoryDuel/engine').then(m => ({ default: m.MemoryDuelEngine })),
  neon_drift: () => import('./games/NeonDrift/engine').then(m => ({ default: m.NeonDriftEngine })),
  pulse_grid: () => import('./games/PulseGrid/engine').then(m => ({ default: m.PulseGridEngine })),
  void_runner: () => import('./games/VoidRunner/engine').then(m => ({ default: m.VoidRunnerEngine })),
  echo_blade: () => import('./games/EchoBlade/engine').then(m => ({ default: m.EchoBladeEngine })),
  hex_collapse: () => import('./games/HexCollapse/engine').then(m => ({ default: m.HexCollapseEngine })),
  chrono_shift: () => import('./games/ChronoShift/engine').then(m => ({ default: m.ChronoShiftEngine })),
  split_stream: () => import('./games/SplitStream/engine').then(m => ({ default: m.SplitStreamEngine })),
  quantum_link: () => import('./games/QuantumLink/engine').then(m => ({ default: m.QuantumLinkEngine })),
  shadow_step: () => import('./games/ShadowStep/engine').then(m => ({ default: m.ShadowStepEngine })),
  tether_ball: () => import('./games/TetherBall/engine').then(m => ({ default: m.TetherBallEngine })),
  nova_core: () => import('./games/NovaCore/engine').then(m => ({ default: m.NovaCoreEngine })),
};

const OrbitSlingLazy = lazy(() =>
  import('./games/OrbitSling').then(m => ({ default: m.OrbitSling }))
);

function GameLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <div className="w-9 h-9 rounded-full border-2 border-zinc-800 border-t-zinc-200 animate-spin" />
    </div>
  );
}

function LazyEngineGame({
  gameId,
  onExit,
}: {
  gameId: string;
  onExit: () => void;
}) {
  const [EngineClass, setEngineClass] = useState<EngineConstructor | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEngineClass(null);
    const loader = engineLoaders[gameId];
    if (!loader) return;
    loader().then(mod => {
      if (!cancelled) setEngineClass(() => mod.default);
    });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const def = GAMES.find(g => g.id === gameId);
  if (!def) return null;

  if (!EngineClass) return <GameLoadingScreen />;

  return (
    <GameContainer
      gameId={gameId}
      title={def.title}
      description={def.description}
      accentColor={def.accentHex}
      EngineClass={EngineClass}
      onExit={onExit}
    />
  );
}

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const renderActiveGame = () => {
    if (!activeGame) return null;
    if (activeGame === 'orbit_sling') {
      return (
        <Suspense fallback={<GameLoadingScreen />}>
          <OrbitSlingLazy onExit={() => setActiveGame(null)} />
        </Suspense>
      );
    }
    if (!engineLoaders[activeGame]) return null;
    return <LazyEngineGame gameId={activeGame} onExit={() => setActiveGame(null)} />;
  };

  return (
    <StoreProvider>
      {activeGame === null && <ArcadeHub onLaunchGame={setActiveGame} />}
      {renderActiveGame()}
    </StoreProvider>
  );
}
