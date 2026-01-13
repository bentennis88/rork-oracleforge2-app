import createContextHook from '@nkzw/create-context-hook';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { OracleConfig } from './types';

export interface Oracle {
  id: string;
  type: string;
  config: Record<string, any>;
  data: any;
  createdAt: number;
}

export interface OracleStore {
  oracles: Oracle[];
  createOracle: (type: string, config?: object) => Promise<Oracle>;
  updateOracle: (id: string, data: any) => Promise<void>;
  deleteOracle: (id: string) => Promise<void>;
  /** Optional helper: update config without touching data */
  updateOracleConfig: (id: string, config: object) => Promise<void>;
  /** Convenience: find by id */
  getOracle: (id: string) => Oracle | undefined;
}

const STORAGE_KEY = '@oracleforge_oracle_store_v1';

function generateId() {
  return 'oracle_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function safeParse(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeOracle(o: any): Oracle | null {
  if (!o || typeof o !== 'object') return null;
  const id = typeof o.id === 'string' ? o.id : generateId();
  const type = typeof o.type === 'string' ? o.type : 'tracker';
  const config = o.config && typeof o.config === 'object' ? o.config : {};
  const data = o.data ?? {};
  const createdAt = typeof o.createdAt === 'number' && Number.isFinite(o.createdAt) ? o.createdAt : Date.now();
  return { id, type, config, data, createdAt };
}

export const [OracleStoreProvider, useOracleStore] = createContextHook<OracleStore>(() => {
  const [oracles, setOracles] = useState<Oracle[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load once
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (!stored) {
          setOracles([]);
          return;
        }
        const parsed = safeParse(stored);
        const arr = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.oracles) ? parsed.oracles : [];
        const normalized = (arr as any[]).map(normalizeOracle).filter(Boolean) as Oracle[];
        setOracles(normalized);
      } catch (e) {
        console.log('[OracleStore] load failed', e);
        setOracles([]);
      } finally {
        setIsLoaded(true);
      }
    })();
  }, []);

  // Persist (debounced) once loaded
  useEffect(() => {
    if (!isLoaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(oracles));
        } catch (e) {
          console.log('[OracleStore] save failed', e);
        }
      })();
    }, 250);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isLoaded, oracles]);

  const getOracle = useCallback((id: string) => oracles.find(o => o.id === id), [oracles]);

  const createOracle = useCallback(async (type: string, config?: object) => {
    const id = generateId();
    const now = Date.now();
    const cfg = (config && typeof config === 'object' ? config : {}) as Record<string, any>;

    // If caller passed an OracleConfig, keep it, but ensure id stays consistent.
    const maybeOracleConfig = cfg as Partial<OracleConfig>;
    const mergedCfg =
      typeof maybeOracleConfig.type === 'string'
        ? ({ ...cfg, id } as any)
        : ({ ...cfg, id } as any);

    const oracle: Oracle = { id, type, config: mergedCfg, data: {}, createdAt: now };
    setOracles(prev => [oracle, ...prev]);
    return oracle;
  }, []);

  const updateOracle = useCallback(async (id: string, data: any) => {
    setOracles(prev =>
      prev.map(o => {
        if (o.id !== id) return o;
        const nextData =
          data && typeof data === 'object' && o.data && typeof o.data === 'object'
            ? { ...o.data, ...data }
            : data;
        return { ...o, data: nextData };
      })
    );
  }, []);

  const updateOracleConfig = useCallback(async (id: string, config: object) => {
    setOracles(prev =>
      prev.map(o => {
        if (o.id !== id) return o;
        const nextCfg =
          config && typeof config === 'object' && o.config && typeof o.config === 'object'
            ? { ...o.config, ...config, id: o.id }
            : { ...(config as any), id: o.id };
        return { ...o, config: nextCfg };
      })
    );
  }, []);

  const deleteOracle = useCallback(async (id: string) => {
    setOracles(prev => prev.filter(o => o.id !== id));
  }, []);

  return useMemo(
    () => ({
      oracles,
      createOracle,
      updateOracle,
      deleteOracle,
      updateOracleConfig,
      getOracle,
    }),
    [createOracle, deleteOracle, getOracle, oracles, updateOracle, updateOracleConfig]
  );
});

