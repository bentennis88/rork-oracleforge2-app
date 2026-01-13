import { OracleKind, OracleSkeletonMeta } from './types';

export const ORACLE_SKELETONS: Record<OracleKind, OracleSkeletonMeta> = {
  tracker: {
    kind: 'tracker',
    id: 'tracker',
    name: 'Tracker Skeleton',
    description: 'A strong starting point for streak-based trackers with charts and logs.',
    promptHint:
      'Use this tracker skeleton pattern (goal, today value, logs, streak, 7-day chart). Keep JSX valid and StyleSheet commas correct.',
  },
  reminder: {
    kind: 'reminder',
    id: 'reminder',
    name: 'Reminder Skeleton',
    description: 'A starting point for scheduled reminders with saved times and toggle.',
    promptHint:
      'Use this reminder skeleton pattern (toggle, times list, schedule/cancel notifications, AsyncStorage persistence). Keep code eval-safe.',
  },
  calculator: {
    kind: 'calculator',
    id: 'calculator',
    name: 'Calculator Skeleton',
    description: 'A safe skeleton for calculators with persisted inputs and derived outputs.',
    promptHint:
      'Use this calculator skeleton pattern (inputs, derived output, AsyncStorage persistence, validation). Keep JSX and quotes balanced.',
  },
};

