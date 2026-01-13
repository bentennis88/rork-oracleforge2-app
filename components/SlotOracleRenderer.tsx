import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, Droplet, Bell, BarChart3, Target, Activity } from 'lucide-react-native';
import colors from '@/constants/colors';

type SlotStat = {
  icon?: string;
  value: string;
  label: string;
};

export type SlotTemplate = {
  stats?: SlotStat[];
};

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  TrendingUp,
  Droplet,
  Bell,
  BarChart3,
  Target,
  Activity,
};

function formatNumber(v: unknown): string {
  if (typeof v === 'number' && Number.isFinite(v)) return String(Math.round(v));
  if (typeof v === 'string') return v;
  return '-';
}

export default function SlotOracleRenderer(props: {
  template: SlotTemplate;
  userId: string;
  oracleId: string;
  data: Record<string, unknown>;
  logs: Array<{ date?: string; type?: string; value?: any }>;
}) {
  const { template, data, logs } = props;

  const derived = useMemo(() => {
    const last7 = logs.slice(0, 500);
    const numericVals = last7
      .map(l => (typeof l?.value === 'number' ? l.value : typeof l?.value?.amount === 'number' ? l.value.amount : null))
      .filter(v => typeof v === 'number') as number[];

    const weeklySum = numericVals.reduce((a, b) => a + b, 0);
    const weeklyProjection = weeklySum;

    return {
      weeklyProjection,
    };
  }, [logs]);

  const stats = template.stats || [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Oracle Dashboard</Text>
        <Text style={styles.subtitle}>Template-powered UI</Text>
      </View>

      <View style={styles.grid}>
        {stats.map((s, idx) => {
          const Icon = s.icon && iconMap[s.icon] ? iconMap[s.icon] : TrendingUp;
          const valueKey = s.value;
          const raw = (derived as any)[valueKey] ?? (data as any)[valueKey];
          return (
            <View key={String(idx)} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.iconWrap}>
                  <Icon size={18} color={colors.accent} />
                </View>
                <Text style={styles.cardLabel}>{s.label}</Text>
              </View>
              <Text style={styles.cardValue}>{formatNumber(raw)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 16,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.textMuted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    width: '48%',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 14,
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.accent + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardLabel: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  cardValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
});

