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
          
          // Filter valid oracles with generated code and deduplicate by ID
          const seenIds = new Set<string>();
          const validOracles = Array.isArray(parsed)
            ? parsed.filter((o: any) => {
                // Check for duplicate IDs
                if (seenIds.has(o.id)) {
                  console.warn('[OraclesContext] Filtering out duplicate oracle:', o.id);
                  return false;
                }
                seenIds.add(o.id);
                
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

  const addOracle = (oracle: Oracle) => {
    setOracles((prev) => {
      // Check if oracle with this ID already exists
      if (prev.some(o => o.id === oracle.id)) {
        console.warn('[OraclesContext] Oracle with ID already exists, updating instead:', oracle.id);
        const next = prev.map(o => o.id === oracle.id ? oracle : o);
        AsyncStorage.setItem('@oracles', JSON.stringify(next)).catch((e) => console.error('[OraclesContext] Failed to save oracles:', e));
        return next;
      }
      const next = [...prev, oracle];
      AsyncStorage.setItem('@oracles', JSON.stringify(next)).catch((e) => console.error('[OraclesContext] Failed to save oracles:', e));
      return next;
    });
  };

  const updateOracle = (updated: Oracle) => {
    setOracles((prev) => {
      const next = prev.map(o => (o.id === updated.id ? updated : o));
      AsyncStorage.setItem('@oracles', JSON.stringify(next)).catch((e) => console.error('[OraclesContext] Failed to save oracles:', e));
      return next;
    });
  };

  const deleteOracle = (id: string) => {
    setOracles((prev) => {
      const next = prev.filter(o => o.id !== id);
      AsyncStorage.setItem('@oracles', JSON.stringify(next)).catch((e) => console.error('[OraclesContext] Failed to save oracles:', e));
      return next;
    });
  };

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
