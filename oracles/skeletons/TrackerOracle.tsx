import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart } from 'react-native-chart-kit';
import { TrendingUp, Plus } from 'lucide-react-native';
import colors from '@/constants/colors';
import firebaseService from '@/services/firebaseService';
import { TrackerOracleConfig } from '../types';

export default function TrackerOracle(props: { config: TrackerOracleConfig }) {
  const { config } = props;
  const storageKey = 'oracle_' + config.id + '_tracker';
  const screenWidth = Dimensions.get('window').width;

  const [isLoading, setIsLoading] = useState(true);
  const [goal, setGoal] = useState(config.dailyGoal);
  const [todayValue, setTodayValue] = useState(0);
  const [input, setInput] = useState(String(config.incrementOptions[0] || 1));
  const [history, setHistory] = useState<Record<string, number>>({});

  const todayKey = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          if (typeof data.goal === 'number') setGoal(data.goal);
          if (typeof data.todayValue === 'number') setTodayValue(data.todayValue);
          if (data.history && typeof data.history === 'object') setHistory(data.history);
        }
      } catch (e) {
        console.log('[TrackerOracle] load failed', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storageKey]);

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ goal, todayValue, history }));
      } catch (e) {
        console.log('[TrackerOracle] save failed', e);
      }
    })();
  }, [goal, todayValue, history, isLoading, storageKey]);

  const add = useCallback(async () => {
    const n = parseInt(input.replace(/[^0-9]/g, ''), 10);
    const amt = Number.isFinite(n) && n > 0 ? n : 1;
    const next = todayValue + amt;
    setTodayValue(next);
    setHistory(prev => ({ ...prev, [todayKey]: next }));

    // Firestore log (optional; safe if firebaseService is provided)
    try {
      await firebaseService.addOracleLog(config.id, {
        type: 'tracker_entry',
        value: { amount: amt, unit: config.unit },
        timestamp: new Date().toISOString(),
        date: todayKey,
      });
    } catch (e) {
      console.log('[TrackerOracle] addOracleLog failed', e);
    }
  }, [config.id, config.unit, input, todayKey, todayValue]);

  const last7 = useMemo(() => {
    const end = new Date();
    const labels: string[] = [];
    const data: number[] = [];
    const windowDays = Math.max(3, Math.min(30, config.chartWindowDays));
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const key = d.toISOString().split('T')[0];
      labels.push(['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()]);
      data.push(Number(history[key] || 0));
    }
    return { labels, data };
  }, [config.chartWindowDays, history]);

  const progress = useMemo(() => {
    if (goal <= 0) return 0;
    return Math.min(1, todayValue / goal);
  }, [goal, todayValue]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading tracker…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <TrendingUp size={18} color={colors.accent} />
        <Text style={styles.title}>{config.title}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Today</Text>
        <Text style={styles.metric}>
          {todayValue} <Text style={styles.muted}> {config.unit} / {goal} {config.unit}</Text>
        </Text>
        <View style={styles.barOuter}>
          <View style={[styles.barInner, { width: Math.round(progress * 100) + '%' }]} />
        </View>

        <View style={styles.row}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {config.incrementOptions.map((opt) => (
              <TouchableOpacity
                key={String(opt)}
                style={[styles.chip, input === String(opt) && styles.chipActive]}
                onPress={() => setInput(String(opt))}
              >
                <Text style={[styles.chipText, input === String(opt) && styles.chipTextActive]}>
                  +{opt}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={styles.button} onPress={add} activeOpacity={0.85}>
            <Plus size={16} color={colors.background} />
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.secondary}
          onPress={() => Alert.alert('Goal', 'Change the goal in the oracle config (dailyGoal).')}
        >
          <Text style={styles.secondaryText}>Set Goal (skeleton)</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Last 7 Days</Text>
        <LineChart
          data={{ labels: last7.labels, datasets: [{ data: last7.data }] }}
          width={screenWidth - 56}
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
          style={{ borderRadius: 16 }}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  center: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginBottom: 8 },
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
  row: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipText: { color: colors.textSecondary, fontWeight: '800', fontSize: 12 },
  chipTextActive: { color: colors.background },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: { color: colors.background, fontWeight: '800', fontSize: 13 },
  secondary: { marginTop: 10, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
});

