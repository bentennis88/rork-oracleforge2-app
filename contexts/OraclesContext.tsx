import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface Oracle {
  id: string;
  title: string;
  description?: string;
  generatedCode: string; // AI-generated React Native component code
  createdAt: number;
  updatedAt: number;
}

interface OraclesContextType {
  oracles: Oracle[];
  addOracle: (oracle: Oracle) => void;
  updateOracle: (oracle: Oracle) => void;
  deleteOracle: (id: string) => void;
}

const OraclesContext = createContext<OraclesContextType | undefined>(undefined);

export const OraclesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [oracles, setOracles] = useState<Oracle[]>([]);

  useEffect(() => {
    const loadOracles = async () => {
      try {
        const stored = await AsyncStorage.getItem('@oracles');
        if (stored) {
          const parsed = JSON.parse(stored);
          
          // Filter valid oracles with generated code
          const validOracles = Array.isArray(parsed)
            ? parsed.filter((o: any) => {
                // New format: has generatedCode
                if (o.generatedCode && typeof o.generatedCode === 'string') {
                  return true;
                }
                console.warn('[OraclesContext] Filtering out invalid oracle:', o.id);
                return false;
              })
            : [];
          
          console.log(`[OraclesContext] Loaded ${validOracles.length} oracles`);
          setOracles(validOracles);
        }
      } catch (error) {
        console.error('[OraclesContext] Failed to load oracles:', error);
      }
    };
    loadOracles();
  }, []);

  const saveOracles = async (newOracles: Oracle[]) => {
    setOracles(newOracles);
    try {
      await AsyncStorage.setItem('@oracles', JSON.stringify(newOracles));
    } catch (error) {
      console.error('[OraclesContext] Failed to save oracles:', error);
    }
  };

  const addOracle = (oracle: Oracle) => saveOracles([...oracles, oracle]);
  const updateOracle = (updated: Oracle) =>
    saveOracles(oracles.map(o => (o.id === updated.id ? updated : o)));
  const deleteOracle = (id: string) => saveOracles(oracles.filter(o => o.id !== id));

  return (
    <OraclesContext.Provider value={{ oracles, addOracle, updateOracle, deleteOracle }}>
      {children}
    </OraclesContext.Provider>
  );
};

export const useOracles = () => {
  const context = useContext(OraclesContext);
  if (!context) throw new Error('useOracles must be used within OraclesProvider');
  return context;
};
