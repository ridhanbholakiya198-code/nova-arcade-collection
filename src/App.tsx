import { useState } from 'react';
import { StoreProvider } from './lib/store.tsx';
import { ArcadeHub } from './components/ArcadeHub';
import { GameContainer } from './components/GameContainer';
import { GAMES } from './types';

// Game Engines
import { OrbitSling } from './games/OrbitSling';
import { NeonDriftEngine } from './games/NeonDrift/engine';
import { PulseGridEngine } from './games/PulseGrid/engine';
import { VoidRunnerEngine } from './games/VoidRunner/engine';
import { EchoBladeEngine } from './games/EchoBlade/engine';
import { HexCollapseEngine } from './games/HexCollapse/engine';
import { ChronoShiftEngine } from './games/ChronoShift/engine';
import { SplitStreamEngine } from './games/SplitStream/engine';
import { ApexDescentEngine } from './games/ApexDescent/engine';
import { QuantumLinkEngine } from './games/QuantumLink/engine';
import { KineticBurstEngine } from './games/KineticBurst/engine';
import { ShadowStepEngine } from './games/ShadowStep/engine';
import { PrismGuardEngine } from './games/PrismGuard/engine';
import { TetherBallEngine } from './games/TetherBall/engine';
import { NovaCoreEngine } from './games/NovaCore/engine';

const engineMap: Record<string, any> = {
  neon_drift: NeonDriftEngine,
  pulse_grid: PulseGridEngine,
  void_runner: VoidRunnerEngine,
  echo_blade: EchoBladeEngine,
  hex_collapse: HexCollapseEngine,
  chrono_shift: ChronoShiftEngine,
  split_stream: SplitStreamEngine,
  apex_descent: ApexDescentEngine,
  quantum_link: QuantumLinkEngine,
  kinetic_burst: KineticBurstEngine,
  shadow_step: ShadowStepEngine,
  prism_guard: PrismGuardEngine,
  tether_ball: TetherBallEngine,
  nova_core: NovaCoreEngine,
};

export default function App() {
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const renderActiveGame = () => {
    if (activeGame === 'orbit_sling') {
      return <OrbitSling onExit={() => setActiveGame(null)} />;
    }
    
    if (activeGame && engineMap[activeGame]) {
      const def = GAMES.find(g => g.id === activeGame);
      if (def) {
        // extract tailwind hex approximation
        const accentHex = def.accent.includes('amber') ? '#f59e0b' : 
                          def.accent.includes('cyan') ? '#22d3ee' :
                          def.accent.includes('rose') ? '#f43f5e' :
                          def.accent.includes('emerald') ? '#34d399' :
                          def.accent.includes('zinc') ? '#d4d4d8' :
                          def.accent.includes('indigo') ? '#818cf8' :
                          def.accent.includes('yellow') ? '#facc15' :
                          def.accent.includes('fuchsia') ? '#e879f9' :
                          def.accent.includes('red') ? '#f87171' :
                          def.accent.includes('blue') ? '#60a5fa' :
                          def.accent.includes('orange') ? '#fb923c' :
                          def.accent.includes('slate') ? '#94a3b8' :
                          def.accent.includes('lime') ? '#a3e635' :
                          def.accent.includes('sky') ? '#38bdf8' :
                          def.accent.includes('purple') ? '#c084fc' : '#ffffff';

        return (
          <GameContainer 
            gameId={activeGame}
            title={def.title}
            description={def.description}
            accentColor={accentHex}
            EngineClass={engineMap[activeGame]}
            onExit={() => setActiveGame(null)}
          />
        );
      }
    }
    return null;
  };

  return (
    <StoreProvider>
      {activeGame === null && (
        <ArcadeHub onLaunchGame={(gameId) => setActiveGame(gameId)} />
      )}
      
      {renderActiveGame()}
    </StoreProvider>
  );
}

