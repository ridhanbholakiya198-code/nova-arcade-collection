import { useState } from 'react';
import { StoreProvider } from './lib/store.tsx';
import { ArcadeHub } from './components/ArcadeHub';
import { GameContainer } from './components/GameContainer';
import { GAMES } from './types';

import { OrbitSling } from './games/OrbitSling';
import { NeonDriftEngine } from './games/NeonDrift/engine';
import { PulseGridEngine } from './games/PulseGrid/engine';
import { VoidRunnerEngine } from './games/VoidRunner/engine';
import { EchoBladeEngine } from './games/EchoBlade/engine';
import { HexCollapseEngine } from './games/HexCollapse/engine';
import { ChronoShiftEngine } from './games/ChronoShift/engine';
import { SplitStreamEngine } from './games/SplitStream/engine';
import { QuantumLinkEngine } from './games/QuantumLink/engine';
import { ShadowStepEngine } from './games/ShadowStep/engine';
import { TetherBallEngine } from './games/TetherBall/engine';
import { NovaCoreEngine } from './games/NovaCore/engine';

import { GravityFlipEngine } from './games/GravityFlip/engine';
import { NeonSnakeEngine } from './games/NeonSnake/engine';
import { ColorMatchEngine } from './games/ColorMatch/engine';
import { SkyHopperEngine } from './games/SkyHopper/engine';
import { TowerBalanceEngine } from './games/TowerBalance/engine';
import { PixelRacerEngine } from './games/PixelRacer/engine';
import { MemoryDuelEngine } from './games/MemoryDuel/engine';

const engineMap: Record<string, any> = {
  gravity_flip: GravityFlipEngine,
  neon_snake: NeonSnakeEngine,
  color_match: ColorMatchEngine,
  sky_hopper: SkyHopperEngine,
  tower_balance: TowerBalanceEngine,
  pixel_racer: PixelRacerEngine,
  memory_duel: MemoryDuelEngine,
  neon_drift: NeonDriftEngine,
  pulse_grid: PulseGridEngine,
  void_runner: VoidRunnerEngine,
  echo_blade: EchoBladeEngine,
  hex_collapse: HexCollapseEngine,
  chrono_shift: ChronoShiftEngine,
  split_stream: SplitStreamEngine,
  quantum_link: QuantumLinkEngine,
  shadow_step: ShadowStepEngine,
  tether_ball: TetherBallEngine,
  nova_core: NovaCoreEngine,
};

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const renderActiveGame = () => {
    if (activeGame === 'orbit_sling') {
      return <OrbitSling onExit={() => setActiveGame(null)} />;
    }
    if (!activeGame || !engineMap[activeGame]) return null;
    const def = GAMES.find(g => g.id === activeGame);
    if (!def) return null;

    return (
      <GameContainer
        gameId={activeGame}
        title={def.title}
        description={def.description}
        accentColor={def.accentHex}
        EngineClass={engineMap[activeGame]}
        onExit={() => setActiveGame(null)}
      />
    );
  };

  return (
    <StoreProvider>
      {activeGame === null && <ArcadeHub onLaunchGame={setActiveGame} />}
      {renderActiveGame()}
    </StoreProvider>
  );
}
