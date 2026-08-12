import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { PlayerProfile } from '../types';

interface StoreContextType {
  profile: PlayerProfile;
  addXp: (amount: number) => void;
  recordGameScore: (gameId: string, score: number) => void;
}

const DEFAULT_PROFILE: PlayerProfile = {
  xp: 0,
  level: 1,
  gamesStats: {},
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<PlayerProfile>(() => {
    const saved = localStorage.getItem('nova_arcade_save');
    return saved ? JSON.parse(saved) : DEFAULT_PROFILE;
  });

  useEffect(() => {
    localStorage.setItem('nova_arcade_save', JSON.stringify(profile));
  }, [profile]);

  const addXp = (amount: number) => {
    setProfile(prev => {
      const newXp = prev.xp + amount;
      // Simple leveling curve: Level = 1 + floor(sqrt(XP / 100))
      const newLevel = Math.max(prev.level, 1 + Math.floor(Math.sqrt(newXp / 100)));
      return { ...prev, xp: newXp, level: newLevel };
    });
  };

  const recordGameScore = (gameId: string, score: number) => {
    setProfile(prev => {
      const currentStats = prev.gamesStats[gameId] || { highScore: 0, playCount: 0, timePlayed: 0 };
      
      const isNewHighScore = score > currentStats.highScore;
      
      return {
        ...prev,
        gamesStats: {
          ...prev.gamesStats,
          [gameId]: {
            ...currentStats,
            highScore: isNewHighScore ? score : currentStats.highScore,
            playCount: currentStats.playCount + 1,
          }
        }
      };
    });
    
    // Grant XP based on score (simplified formula)
    addXp(Math.floor(score / 10));
  };

  return (
    <StoreContext.Provider value={{ profile, addXp, recordGameScore }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (!context) throw new Error('useStore must be used within StoreProvider');
  return context;
}
