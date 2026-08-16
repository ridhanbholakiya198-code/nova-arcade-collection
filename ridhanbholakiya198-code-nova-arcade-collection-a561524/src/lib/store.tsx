import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { PlayerProfile } from '../types';

interface StoreContextType {
  profile: PlayerProfile;
  addXp: (amount: number) => void;
  recordGameScore: (gameId: string, score: number, playedSeconds?: number) => void;
  startGameSession: (gameId: string) => void;
  endGameSession: (gameId: string) => void;
  totalTimePlayed: number;
}

const DEFAULT_PROFILE: PlayerProfile = { xp: 0, level: 1, gamesStats: {}, totalTimePlayed: 0 };
const StoreContext = createContext<StoreContextType | undefined>(undefined);

function loadProfile(): PlayerProfile {
  try {
    const saved = localStorage.getItem('nova_arcade_save');
    if (!saved) return DEFAULT_PROFILE;
    const parsed = JSON.parse(saved) as Partial<PlayerProfile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      gamesStats: parsed.gamesStats ?? {},
      totalTimePlayed: Number(parsed.totalTimePlayed ?? 0),
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(loadProfile);
  const activeGameRef = useRef<string | null>(null);
  const gameStartRef = useRef<number | null>(null);
  const appLastVisibleRef = useRef(Date.now());

  useEffect(() => {
    localStorage.setItem('nova_arcade_save', JSON.stringify(profile));
  }, [profile]);

  const addXp = useCallback((amount: number) => {
    if (amount <= 0) return;
    setProfile(prev => {
      const newXp = prev.xp + amount;
      const newLevel = Math.max(prev.level, 1 + Math.floor(Math.sqrt(newXp / 100)));
      return { ...prev, xp: newXp, level: newLevel };
    });
  }, []);

  const endGameSession = useCallback((gameId: string) => {
    if (activeGameRef.current !== gameId || gameStartRef.current === null) return;
    const seconds = Math.max(0, (Date.now() - gameStartRef.current) / 1000);
    activeGameRef.current = null;
    gameStartRef.current = null;
    if (seconds < 0.05) return;
    setProfile(prev => ({
      ...prev,
      gamesStats: {
        ...prev.gamesStats,
        [gameId]: {
          ...(prev.gamesStats[gameId] ?? { highScore: 0, playCount: 0, timePlayed: 0 }),
          timePlayed: (prev.gamesStats[gameId]?.timePlayed ?? 0) + seconds,
        },
      },
    }));
  }, []);

  const startGameSession = useCallback((gameId: string) => {
    if (activeGameRef.current === gameId && gameStartRef.current !== null) return;
    if (activeGameRef.current) {
      const previous = activeGameRef.current;
      endGameSession(previous);
    }
    activeGameRef.current = gameId;
    gameStartRef.current = Date.now();
  }, [endGameSession]);

  const recordGameScore = useCallback((gameId: string, score: number, playedSeconds = 0) => {
    setProfile(prev => {
      const currentStats = prev.gamesStats[gameId] || { highScore: 0, playCount: 0, timePlayed: 0 };
      return {
        ...prev,
        gamesStats: {
          ...prev.gamesStats,
          [gameId]: {
            ...currentStats,
            highScore: score > currentStats.highScore ? score : currentStats.highScore,
            playCount: currentStats.playCount + 1,
            timePlayed: currentStats.timePlayed + Math.max(0, playedSeconds),
          },
        },
      };
    });
    addXp(Math.floor(score / 10));
  }, [addXp]);

  const flushAppTime = useCallback(() => {
    const now = Date.now();
    const delta = Math.max(0, (now - appLastVisibleRef.current) / 1000);
    appLastVisibleRef.current = now;
    if (delta < 0.05 || document.hidden) return;
    setProfile(prev => ({ ...prev, totalTimePlayed: prev.totalTimePlayed + delta }));
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) flushAppTime();
      else appLastVisibleRef.current = Date.now();
    };
    document.addEventListener('visibilitychange', onVisibility);
    const interval = window.setInterval(() => { if (!document.hidden) flushAppTime(); }, 10000);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(interval);
    };
  }, [flushAppTime]);

  return (
    <StoreContext.Provider value={{
      profile, addXp, recordGameScore, startGameSession, endGameSession,
      totalTimePlayed: profile.totalTimePlayed,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
