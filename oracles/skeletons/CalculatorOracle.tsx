import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calculator, RefreshCw } from 'lucide-react-native';
import colors from '@/constants/colors';
import { OracleComponentProps } from '../types';

export default function CalculatorOracle(props: OracleComponentProps) {
  const storageKey = 'oracle_' + props.oracleId + '_calculator';

  const [isLoading, setIsLoading] = useState(true);
  const [a, setA] = useState('100');
  const [b, setB] = useState('15');
  const [c, setC] = useState('5');

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          if (typeof data.a === 'string') setA(data.a);
          if (typeof data.b === 'string') setB(data.b);
          if (typeof data.c === 'string') setC(data.c);
        }
      } catch (e) {
        console.log('[CalculatorOracle] load failed', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storageKey]);

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ a, b, c }));
      } catch (e) {
        console.log('[CalculatorOracle] save failed', e);
      }
    })();
  }, [a, b, c, isLoading, storageKey]);

  const parsed = useMemo(() => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    const nc = parseFloat(c);
    return {
      na: Number.isFinite(na) ? na : 0,
      nb: Number.isFinite(nb) ? nb : 0,
      nc: Number.isFinite(nc) ? nc : 0,
    };
  }, [a, b, c]);

  const result = useMemo(() => {
    // Example: compound growth: na * (1 + nb/100)^nc
    const r = parsed.na * Math.pow(1 + parsed.nb / 100, parsed.nc);
    return Number.isFinite(r) ? r : 0;
  }, [parsed]);

  const reset = useCallback(() => {
    Alert.alert('Reset', 'Reset inputs to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          setA('100');
          setB('15');
          setC('5');
        },
      },
    ]);
  }, []);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading calculator…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Calculator size={18} color={colors.accent} />
        <Text style={styles.title}>Calculator Skeleton</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Inputs</Text>
        <View style={styles.row}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Principal</Text>
            <TextInput
              style={styles.input}
              value={a}
              onChangeText={setA}
              keyboardType="numeric"
              placeholder="100"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Rate %</Text>
            <TextInput
              style={styles.input}
              value={b}
              onChangeText={setB}
              keyboardType="numeric"
              placeholder="15"
              placeholderTextColor={colors.textMuted}
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Years</Text>
            <TextInput
              style={styles.input}
              value={c}
              onChangeText={setC}
              keyboardType="numeric"
              placeholder="5"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        </View>

        <TouchableOpacity style={styles.secondary} onPress={reset}>
          <RefreshCw size={14} color={colors.accent} />
          <Text style={styles.secondaryText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Output</Text>
        <Text style={styles.metric}>{result.toFixed(2)}</Text>
        <Text style={styles.muted}>Example formula: principal × (1 + rate%)^years</Text>
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
  label: { color: colors.textSecondary, fontSize: 12, fontWeight: '800', marginBottom: 10 },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 8 },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  field: { flex: 1, minWidth: 90 },
  fieldLabel: { color: colors.textMuted, fontSize: 11, marginBottom: 6 },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  metric: { color: colors.text, fontSize: 28, fontWeight: '900' },
  secondary: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  secondaryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});

