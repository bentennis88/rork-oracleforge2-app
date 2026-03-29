import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import colors from '@/constants/colors';
import { TrackerOracleConfig } from '../types';

type Persisted = {
  v: 1;
  goal: number;
  dateKey: string; // YYYY-MM-DD
  todayValue: number;
  history: Record<string, number>; // YYYY-MM-DD -> total
};

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function getDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function sanitizeHistory(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw as any)) {
    if (typeof k !== 'string') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(k)) continue;
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    if (!Number.isFinite(n) || n < 0) continue;
    out[k] = n;
  }
  return out;
}

export default function TrackerOracle(props: { config: TrackerOracleConfig }) {
  const config = props?.config;

  // Safe defaults + defensive checks
  const id = String(config?.id || 'tracker');
  const title = String(config?.title || 'Tracker');
  const unit = String(config?.unit || '');
  const initialGoal = clamp(Number(config?.dailyGoal ?? 10), 1, 1_000_000);
  const chartWindowDays = clamp(Number(config?.chartWindowDays ?? 7), 3, 30);
  const increments = useMemo(() => {
    const raw = Array.isArray(config?.incrementOptions) ? config!.incrementOptions : [1, 5, 10];
    const cleaned = raw
      .map(n => (typeof n === 'number' ? n : parseFloat(String(n))))
      .filter(n => Number.isFinite(n) && n > 0)
      .slice(0, 8);
    return cleaned.length ? cleaned : [1, 5, 10];
  }, [config]);

  const storageKey = 'oracle_' + id + '_tracker';
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = Math.max(260, screenWidth - 56);

  const [isLoading, setIsLoading] = useState(true);
  const [goal, setGoal] = useState(initialGoal);
  const [dateKey, setDateKey] = useState(() => getDateKey(new Date()));
  const [todayValue, setTodayValue] = useState(0);
  const [history, setHistory] = useState<Record<string, number>>({});

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load persisted state
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (!saved) return;
        const raw = JSON.parse(saved);
        const loaded: Persisted | null =
          raw && typeof raw === 'object' && raw.v === 1 ? (raw as Persisted) : null;
        if (!loaded) return;

        const nowKey = getDateKey(new Date());
        const loadedHist = sanitizeHistory(loaded.history);
        const loadedGoal = clamp(Number(loaded.goal), 1, 1_000_000);
        const loadedDateKey = typeof loaded.dateKey === 'string' ? loaded.dateKey : nowKey;
        const loadedToday = clamp(Number(loaded.todayValue), 0, 1_000_000);

        setGoal(loadedGoal);
        setHistory(loadedHist);
        setDateKey(nowKey);

        // If the saved day differs from today, use history for today (or 0).
        if (loadedDateKey !== nowKey) setTodayValue(Number(loadedHist[nowKey] || 0));
        else setTodayValue(loadedToday);
      } catch (e) {
        console.log('[TrackerOracle] load failed', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storageKey]);

  // Keep dateKey current if app stays open across midnight
  useEffect(() => {
    const t = setInterval(() => {
      const nowKey = getDateKey(new Date());
      setDateKey(prev => (prev === nowKey ? prev : nowKey));
    }, 60_000);
    return () => clearInterval(t);
  }, []);

  // Ensure todayValue reflects history for current dateKey
  useEffect(() => {
    const v = Number(history[dateKey] || 0);
    if (Number.isFinite(v) && v !== todayValue) setTodayValue(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateKey]);

  // Persist state (debounced)
  useEffect(() => {
    if (isLoading) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      (async () => {
        try {
          const payload: Persisted = { v: 1, goal, dateKey, todayValue, history };
          await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
        } catch (e) {
          console.log('[TrackerOracle] save failed', e);
        }
      })();
    }, 250);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [dateKey, goal, history, isLoading, storageKey, todayValue]);

  const add = useCallback(
    (amount: number) => {
      const amt = clamp(Number(amount), 1, 1_000_000);
      const next = clamp(todayValue + amt, 0, 1_000_000);
      setTodayValue(next);
      setHistory(prev => ({ ...prev, [dateKey]: next }));
    },
    [dateKey, todayValue]
  );

  const progress = useMemo(() => {
    const safeGoal = clamp(goal, 1, 1_000_000);
    return clamp(todayValue / safeGoal, 0, 1);
  }, [goal, todayValue]);

  const chartSeries = useMemo(() => {
    const end = new Date();
    const labels: string[] = [];
    const data: number[] = [];
    for (let i = chartWindowDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = getDateKey(d);
      if (chartWindowDays <= 7) {
        labels.push(['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]);
      } else {
        labels.push(String(d.getMonth() + 1) + '/' + String(d.getDate()));
      }
      data.push(Number(history[key] || 0));
    }
    return { labels, data };
  }, [chartWindowDays, history]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading tracker…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerDot} />
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <View style={{ flex: 1 }} />
        <Text style={styles.headerMeta}>{dateKey}</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Progress</Text>
        <Text style={styles.metric}>
          {todayValue}
          <Text style={styles.muted}>
            {unit ? ' ' + unit : ''} / {goal}
            {unit ? ' ' + unit : ''}
          </Text>
        </Text>
        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: Math.round(progress * 100) + '%' }]} />
        </View>
        <View style={styles.progressRow}>
          <Text style={styles.muted}>{Math.round(progress * 100)}%</Text>
          <Text style={styles.muted}>
            Remaining: {Math.max(0, goal - todayValue)}
            {unit ? ' ' + unit : ''}
          </Text>
        </View>

        {/* Add buttons */}
        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>Add</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {increments.map((opt, idx) => (
            <View key={String(opt) + '_' + String(idx)} style={styles.chipWrap}>
              <TouchableOpacity style={styles.chip} onPress={() => add(opt)} activeOpacity={0.85}>
                <Text style={styles.chipText}>+{opt}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() =>
            Alert.alert(
              'Tracker Skeleton',
              'This is a fixed skeleton. Edit the oracle config to change goal/unit/increments.'
            )
          }
          activeOpacity={0.85}
        >
          <Text style={styles.secondaryText}>Edit via config</Text>
        </TouchableOpacity>
      </View>

      {/* Weekly chart */}
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>History chart</Text>
        <Text style={styles.muted}>Totals per day (last {chartWindowDays} days)</Text>
        <LineChart
          data={{ labels: chartSeries.labels, datasets: [{ data: chartSeries.data }] }}
          width={chartWidth}
          height={220}
          chartConfig={{
            backgroundColor: colors.surface,
            backgroundGradientFrom: colors.surfaceLight,
            backgroundGradientTo: colors.surface,
            decimalPlaces: 0,
            color: (opacity = 1) => 'rgba(10, 255, 230, ' + opacity + ')',
            labelColor: (opacity = 1) => 'rgba(255, 255, 255, ' + opacity + ')',
            style: { borderRadius: 16 },
            propsForDots: { r: '4' },
          }}
          style={{ borderRadius: 16, marginTop: 10 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  center: { padding: 24, alignItems: 'center', justifyContent: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  headerDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.accent,
    marginRight: 10,
  },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  headerMeta: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  sectionLabel: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 8 },
  metric: { color: colors.text, fontSize: 26, fontWeight: '900' },
  muted: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },

  barOuter: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surfaceLight,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    marginTop: 12,
  },
  barInner: { height: 10, backgroundColor: colors.accent },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },

  chips: { paddingVertical: 2, paddingRight: 6 },
  chipWrap: { marginRight: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  chipText: { color: colors.text, fontWeight: '900', fontSize: 12 },

  secondary: {
    marginTop: 12,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  secondaryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});

