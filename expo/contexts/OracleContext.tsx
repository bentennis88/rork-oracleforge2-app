/**
 * Back-compat wrapper: older screens import `useOracles` from `@/contexts/OracleContext`.
 * The actual source of truth is now `OracleStore` in `oracles/OracleStore.tsx`.
 */
import createContextHook from '@nkzw/create-context-hook';
import React, { useMemo } from 'react';
import type { OracleConfig } from '@/oracles/types';
import { useOracleStore } from '@/oracles/OracleStore';

export const [OracleProvider, useOracles] = createContextHook(() => {
  const store = useOracleStore();

  return useMemo(() => {
    return {
      oracles: store.oracles,
      /**
       * Preferred: createOracle(type, config)
       */
      createOracle: store.createOracle,
      updateOracle: store.updateOracle,
      deleteOracle: store.deleteOracle,
      updateOracleConfig: store.updateOracleConfig,
      getOracle: store.getOracle,

      /**
       * Legacy convenience: createOracleFromConfig(config)
       */
      createOracleFromConfig: async (config: OracleConfig) => {
        return await store.createOracle(config.type, config as any);
      },
    };
  }, [store]);
});

