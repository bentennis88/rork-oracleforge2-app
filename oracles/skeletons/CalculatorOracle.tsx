import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Calculator, RefreshCw } from 'lucide-react-native';
import colors from '@/constants/colors';
import { CalculatorOracleConfig } from '../types';

type Token =
  | { t: 'num'; v: number }
  | { t: 'id'; v: string }
  | { t: 'op'; v: string }
  | { t: 'lp' }
  | { t: 'rp' };

function tokenize(expr: string): Token[] | null {
  const s = String(expr || '');
  const tokens: Token[] = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === '\n' || c === '\t' || c === '\r') {
      i += 1;
      continue;
    }
    if (c === '(') {
      tokens.push({ t: 'lp' });
      i += 1;
      continue;
    }
    if (c === ')') {
      tokens.push({ t: 'rp' });
      i += 1;
      continue;
    }
    if (c === '+' || c === '-' || c === '*' || c === '/' ) {
      // Support ** for exponent
      if (c === '*' && s[i + 1] === '*') {
        tokens.push({ t: 'op', v: '**' });
        i += 2;
        continue;
      }
      tokens.push({ t: 'op', v: c });
      i += 1;
      continue;
    }
    if ((c >= '0' && c <= '9') || c === '.') {
      let j = i + 1;
      while (j < s.length && ((s[j] >= '0' && s[j] <= '9') || s[j] === '.')) j += 1;
      const num = parseFloat(s.slice(i, j));
      if (!Number.isFinite(num)) return null;
      tokens.push({ t: 'num', v: num });
      i = j;
      continue;
    }
    if ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c === '_') {
      let j = i + 1;
      while (j < s.length) {
        const ch = s[j];
        const ok =
          (ch >= 'a' && ch <= 'z') ||
          (ch >= 'A' && ch <= 'Z') ||
          (ch >= '0' && ch <= '9') ||
          ch === '_';
        if (!ok) break;
        j += 1;
      }
      tokens.push({ t: 'id', v: s.slice(i, j) });
      i = j;
      continue;
    }
    return null;
  }
  return tokens;
}

function precedence(op: string): number {
  if (op === '**') return 4;
  if (op === '*' || op === '/') return 3;
  if (op === '+' || op === '-') return 2;
  return 0;
}

function rightAssoc(op: string): boolean {
  return op === '**';
}

function toRpn(tokens: Token[]): Token[] | null {
  const out: Token[] = [];
  const stack: Token[] = [];
  for (const tok of tokens) {
    if (tok.t === 'num' || tok.t === 'id') out.push(tok);
    else if (tok.t === 'op') {
      while (stack.length) {
        const top = stack[stack.length - 1];
        if (top.t !== 'op') break;
        const p1 = precedence(tok.v);
        const p2 = precedence(top.v);
        if (p2 > p1 || (p2 === p1 && !rightAssoc(tok.v))) {
          out.push(stack.pop() as Token);
        } else break;
      }
      stack.push(tok);
    } else if (tok.t === 'lp') stack.push(tok);
    else if (tok.t === 'rp') {
      while (stack.length && stack[stack.length - 1].t !== 'lp') {
        out.push(stack.pop() as Token);
      }
      if (!stack.length) return null;
      stack.pop(); // remove lp
    }
  }
  while (stack.length) {
    const t = stack.pop() as Token;
    if (t.t === 'lp' || t.t === 'rp') return null;
    out.push(t);
  }
  return out;
}

function evalRpn(rpn: Token[], vars: Record<string, number>): number | null {
  const st: number[] = [];
  for (const tok of rpn) {
    if (tok.t === 'num') st.push(tok.v);
    else if (tok.t === 'id') st.push(Number.isFinite(vars[tok.v]) ? vars[tok.v] : 0);
    else if (tok.t === 'op') {
      const b = st.pop();
      const a = st.pop();
      if (a == null || b == null) return null;
      let r = 0;
      if (tok.v === '+') r = a + b;
      else if (tok.v === '-') r = a - b;
      else if (tok.v === '*') r = a * b;
      else if (tok.v === '/') r = b === 0 ? NaN : a / b;
      else if (tok.v === '**') r = Math.pow(a, b);
      if (!Number.isFinite(r)) return null;
      st.push(r);
    }
  }
  if (st.length !== 1) return null;
  return st[0];
}

export default function CalculatorOracle(props: { config: CalculatorOracleConfig }) {
  const { config } = props;
  const storageKey = 'oracle_' + config.id + '_calculator';

  const [isLoading, setIsLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const inp of config.inputs) {
      const def = typeof inp.defaultValue === 'number' ? String(inp.defaultValue) : '';
      initial[inp.key] = def;
    }
    return initial;
  });

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          if (data && typeof data.values === 'object') setValues(data.values);
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
        await AsyncStorage.setItem(storageKey, JSON.stringify({ values }));
      } catch (e) {
        console.log('[CalculatorOracle] save failed', e);
      }
    })();
  }, [values, isLoading, storageKey]);

  const parsedVars = useMemo(() => {
    const out: Record<string, number> = {};
    for (const k of Object.keys(values)) {
      const n = parseFloat(String(values[k] || '').replace(/[^0-9.\-]/g, ''));
      out[k] = Number.isFinite(n) ? n : 0;
    }
    return out;
  }, [values]);

  const result = useMemo(() => {
    const tokens = tokenize(config.formula);
    if (!tokens) return null;
    const rpn = toRpn(tokens);
    if (!rpn) return null;
    return evalRpn(rpn, parsedVars);
  }, [config.formula, parsedVars]);

  const reset = useCallback(() => {
    Alert.alert('Reset', 'Reset inputs to defaults?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        onPress: () => {
          const initial: Record<string, string> = {};
          for (const inp of config.inputs) {
            const def = typeof inp.defaultValue === 'number' ? String(inp.defaultValue) : '';
            initial[inp.key] = def;
          }
          setValues(initial);
        },
      },
    ]);
  }, [config.inputs]);

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
        <Text style={styles.title}>{config.title}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Inputs</Text>
        <View style={styles.row}>
          {config.inputs.map(inp => (
            <View key={inp.key} style={styles.field}>
              <Text style={styles.fieldLabel}>
                {inp.label}{inp.unit ? ' (' + inp.unit + ')' : ''}
              </Text>
              <TextInput
                style={styles.input}
                value={values[inp.key] ?? ''}
                onChangeText={(t) => setValues(prev => ({ ...prev, [inp.key]: t }))}
                keyboardType="numeric"
                placeholder={typeof inp.defaultValue === 'number' ? String(inp.defaultValue) : ''}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.secondary} onPress={reset}>
          <RefreshCw size={14} color={colors.accent} />
          <Text style={styles.secondaryText}>Reset</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Output</Text>
        <Text style={styles.metric}>{result == null ? '—' : result.toFixed(2)}</Text>
        <Text style={styles.muted}>Formula: {config.formula}</Text>
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

