import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Oracle, OracleLog, OracleCategory } from '@/types';
import { useAuth } from './AuthContext';

const ORACLES_STORAGE_KEY = '@oracleforge_oracles';

const generateOracleId = () => {
  return 'oracle_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const oracleColors = ['#0AFFE6', '#FF3B5C', '#00FF88', '#FFB800', '#8B5CF6', '#EC4899'];
const oracleIcons = ['Zap', 'Target', 'TrendingUp', 'Clock', 'BarChart3', 'Activity'];

const detectCategory = (prompt: string, name: string): OracleCategory => {
  const text = (prompt + ' ' + name).toLowerCase();
  if (text.includes('track') || text.includes('log') || text.includes('habit') || text.includes('streak')) return 'tracker';
  if (text.includes('calc') || text.includes('convert') || text.includes('compute')) return 'calculator';
  if (text.includes('list') || text.includes('todo') || text.includes('shopping') || text.includes('grocery')) return 'list';
  if (text.includes('remind') || text.includes('alarm') || text.includes('notification') || text.includes('alert')) return 'reminder';
  if (text.includes('money') || text.includes('finance') || text.includes('invest') || text.includes('stock') || text.includes('budget') || text.includes('expense')) return 'finance';
  if (text.includes('health') || text.includes('water') || text.includes('sleep') || text.includes('exercise') || text.includes('fitness') || text.includes('calorie')) return 'health';
  if (text.includes('pomodoro') || text.includes('focus') || text.includes('task') || text.includes('project') || text.includes('goal')) return 'productivity';
  return 'other';
};

export const [OracleProvider, useOracles] = createContextHook(() => {
  const { user } = useAuth();
  const [oracles, setOracles] = useState<Oracle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const userIdRef = useRef(user?.id);

  const saveOracles = useCallback(async (newOracles: Oracle[], userId: string) => {
    try {
      await AsyncStorage.setItem(`${ORACLES_STORAGE_KEY}_${userId}`, JSON.stringify(newOracles));
    } catch (error) {
      console.log('Error saving oracles:', error);
    }
  }, []);

  useEffect(() => {
    userIdRef.current = user?.id;
    
    const loadOracles = async () => {
      if (!user?.id) {
        setOracles([]);
        setIsLoading(false);
        return;
      }
      
      try {
        const stored = await AsyncStorage.getItem(`${ORACLES_STORAGE_KEY}_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored) as Oracle[];
          setOracles(parsed);
        } else {
          setOracles([]);
        }
      } catch (error) {
        console.log('Error loading oracles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadOracles();
  }, [user?.id]);

  const createOracle = useCallback(async (prompt: string, name: string, generatedCode: string) => {
    const userId = userIdRef.current;
    if (!userId) return null;
    
    const category = detectCategory(prompt, name);
    const newOracle: Oracle = {
      id: generateOracleId(),
      userId,
      name,
      description: prompt.substring(0, 100),
      prompt,
      generatedCode,
      icon: oracleIcons[Math.floor(Math.random() * oracleIcons.length)],
      color: oracleColors[Math.floor(Math.random() * oracleColors.length)],
      category,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isActive: true,
      data: {},
      logs: [],
    };

    setOracles(prev => {
      const updated = [newOracle, ...prev];
      saveOracles(updated, userId);
      return updated;
    });
    
    return newOracle;
  }, [saveOracles]);

  const updateOracle = useCallback(async (id: string, updates: Partial<Oracle>) => {
    const userId = userIdRef.current;
    if (!userId) return;
    
    setOracles(prev => {
      const updated = prev.map(o => 
        o.id === id ? { ...o, ...updates, updatedAt: Date.now() } : o
      );
      saveOracles(updated, userId);
      return updated;
    });
  }, [saveOracles]);

  const deleteOracle = useCallback(async (id: string) => {
    const userId = userIdRef.current;
    if (!userId) return;
    
    setOracles(prev => {
      const updated = prev.filter(o => o.id !== id);
      saveOracles(updated, userId);
      return updated;
    });
  }, [saveOracles]);

  const updateOracleData = useCallback(async (id: string, data: Record<string, unknown>) => {
    const userId = userIdRef.current;
    if (!userId) return;
    
    setOracles(prev => {
      const updated = prev.map(o => 
        o.id === id ? { ...o, data: { ...o.data, ...data }, updatedAt: Date.now() } : o
      );
      saveOracles(updated, userId);
      return updated;
    });
  }, [saveOracles]);

  const addLog = useCallback(async (oracleId: string, log: Omit<OracleLog, 'id' | 'timestamp' | 'date'>) => {
    const userId = userIdRef.current;
    if (!userId) return;
    
    const newLog: OracleLog = {
      id: 'log_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 8),
      timestamp: Date.now(),
      date: new Date().toDateString(),
      ...log,
    };
    
    setOracles(prev => {
      const updated = prev.map(o => {
        if (o.id === oracleId) {
          const logs = o.logs || [];
          return { ...o, logs: [...logs, newLog], updatedAt: Date.now() };
        }
        return o;
      });
      saveOracles(updated, userId);
      return updated;
    });
    
    return newLog;
  }, [saveOracles]);

  const getLogs = useCallback((oracleId: string, options?: { type?: string; days?: number }) => {
    const oracle = oracles.find(o => o.id === oracleId);
    if (!oracle) return [];
    
    let logs = oracle.logs || [];
    
    if (options?.type) {
      logs = logs.filter(l => l.type === options.type);
    }
    
    if (options?.days) {
      const cutoff = Date.now() - (options.days * 24 * 60 * 60 * 1000);
      logs = logs.filter(l => l.timestamp >= cutoff);
    }
    
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }, [oracles]);

  const clearLogs = useCallback(async (oracleId: string, options?: { type?: string; olderThan?: number }) => {
    const userId = userIdRef.current;
    if (!userId) return;
    
    setOracles(prev => {
      const updated = prev.map(o => {
        if (o.id === oracleId) {
          let logs = o.logs || [];
          
          if (options?.type) {
            logs = logs.filter(l => l.type !== options.type);
          } else if (options?.olderThan) {
            logs = logs.filter(l => l.timestamp >= options.olderThan!);
          } else {
            logs = [];
          }
          
          return { ...o, logs, updatedAt: Date.now() };
        }
        return o;
      });
      saveOracles(updated, userId);
      return updated;
    });
  }, [saveOracles]);

  const userOracles = useMemo(() => {
    const userId = userIdRef.current;
    if (!userId) return [];
    return oracles.filter(o => o.userId === userId);
  }, [oracles]);

  return {
    oracles: userOracles,
    isLoading,
    createOracle,
    updateOracle,
    deleteOracle,
    updateOracleData,
    addLog,
    getLogs,
    clearLogs,
  };
});
