import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Save, Sparkles } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useOracles } from '@/contexts/OracleContext';
import colors from '@/constants/colors';
import { renderOracle } from '@/oracles/registry';
import type { OracleConfig, OracleType } from '@/oracles/types';

export default function CreateScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { user, isAuthenticated } = useAuth();
  const { createOracle } = useOracles();

  const [type, setType] = useState<OracleType>('tracker');
  const [title, setTitle] = useState('My Oracle');
  const [description, setDescription] = useState('A simple tool I can use every day.');

  // Tracker fields
  const [unit, setUnit] = useState('cups');
  const [dailyGoal, setDailyGoal] = useState('8');
  const [incrementOptions, setIncrementOptions] = useState('1,2,4');

  // Reminder fields
  const [message, setMessage] = useState('Time to drink water');
  const [startHour, setStartHour] = useState('8');
  const [endHour, setEndHour] = useState('18');
  const [intervalMinutes, setIntervalMinutes] = useState('60');

  // Calculator fields
  const [formula, setFormula] = useState('(a + b + c)');
  const [calcA, setCalcA] = useState('A');
  const [calcB, setCalcB] = useState('B');
  const [calcC, setCalcC] = useState('C');

  const handleSave = async () => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign in required', 'Please sign in to save oracles', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }

    if (!title.trim()) {
      Alert.alert('Error', 'Please provide a name');
      return;
    }

    try {
      const created = await createOracle(buildConfigForSave());
      if (!created) {
        throw new Error('Failed to create oracle');
      }

      Alert.alert('Success!', 'Your oracle has been saved', [
        {
          text: 'View Dashboard',
          onPress: () => router.push('/(tabs)'),
        },
        {
          text: 'Create Another',
          onPress: () => {
            setType('tracker');
            setTitle('My Oracle');
            setDescription('A simple tool I can use every day.');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Save Failed', error.message);
      console.error('[Create] Save error:', error);
    }
  };

  const examples = [
    {
      label: 'Water tracker',
      type: 'tracker' as const,
      title: 'Water Tracker',
      description: 'Track daily water intake with quick add buttons and a weekly chart.',
    },
    {
      label: 'Hourly reminder',
      type: 'reminder' as const,
      title: 'Water Reminder',
      description: 'Get reminders during the day at a fixed interval.',
    },
    {
      label: 'Compound growth',
      type: 'calculator' as const,
      title: 'Growth Calculator',
      description: 'Compute a formula from a few numeric inputs.',
    },
  ];

  const buildConfigForPreview = useCallbackConfig((): OracleConfig => {
    const base = { id: 'preview', title: title.trim() || 'Oracle', description: description.trim() };
    if (type === 'reminder') {
      return {
        ...base,
        type: 'reminder',
        message: message.trim() || 'Reminder',
        startHour: clampInt(startHour, 0, 23, 8),
        endHour: clampInt(endHour, 0, 23, 18),
        intervalMinutes: clampInt(intervalMinutes, 15, 180, 60),
      };
    }
    if (type === 'calculator') {
      return {
        ...base,
        type: 'calculator',
        inputs: [
          { key: 'a', label: calcA.trim() || 'A', defaultValue: 10 },
          { key: 'b', label: calcB.trim() || 'B', defaultValue: 5 },
          { key: 'c', label: calcC.trim() || 'C', defaultValue: 2 },
        ],
        formula: formula.trim() || '(a + b + c)',
      };
    }
    const inc = parseNumberList(incrementOptions);
    return {
      ...base,
      type: 'tracker',
      unit: unit.trim(),
      dailyGoal: clampInt(dailyGoal, 1, 1_000_000, 10),
      incrementOptions: inc.length ? inc : [1, 2, 4],
      chartWindowDays: 7,
    };
  });

  const buildConfigForSave = () => {
    // Same as preview, but allow createOracle() to assign the final id.
    const preview = buildConfigForPreview();
    return { ...(preview as any), id: 'draft' } as OracleConfig;
  };

  const previewConfig = useMemo(() => buildConfigForPreview(), [buildConfigForPreview]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <Sparkles size={32} color={colors.accent} />
          <Text style={styles.title}>Create Your Oracle</Text>
          <Text style={styles.subtitle}>Choose a template and customize it</Text>
        </View>

        {/* Examples */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Examples</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {examples.map((ex, index) => (
              <TouchableOpacity
                key={index}
                style={styles.exampleChip}
                onPress={() => {
                  setType(ex.type);
                  setTitle(ex.title);
                  setDescription(ex.description);
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: 220, animated: true }), 50);
                }}
              >
                <Text style={styles.exampleText}>{ex.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Basics */}
        <View style={styles.section}>
          <Text style={styles.label}>Oracle Name</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="My Oracle"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={[styles.label, { marginTop: 12 }]}>Type</Text>
          <View style={styles.typeRow}>
            {(['tracker', 'reminder', 'calculator'] as OracleType[]).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, type === t && styles.typeChipActive]}
                onPress={() => setType(t)}
                activeOpacity={0.85}
              >
                <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, { marginTop: 12 }]}>Description</Text>
          <TextInput
            style={styles.textArea}
            value={description}
            onChangeText={setDescription}
            placeholder="What is this oracle for?"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Type-specific fields */}
        {type === 'tracker' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tracker settings</Text>
            <Text style={styles.label}>Unit (optional)</Text>
            <TextInput
              style={styles.input}
              value={unit}
              onChangeText={setUnit}
              placeholder="e.g. cups, pages, minutes"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Daily goal</Text>
            <TextInput
              style={styles.input}
              value={dailyGoal}
              onChangeText={setDailyGoal}
              keyboardType="numeric"
              placeholder="10"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Increment buttons</Text>
            <Text style={styles.hint}>Comma-separated numbers (e.g. 1,2,4)</Text>
            <TextInput
              style={styles.input}
              value={incrementOptions}
              onChangeText={setIncrementOptions}
              placeholder="1,2,4"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        {type === 'reminder' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder settings</Text>
            <Text style={styles.label}>Message</Text>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Reminder message"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Start hour (0-23)</Text>
            <TextInput
              style={styles.input}
              value={startHour}
              onChangeText={setStartHour}
              keyboardType="numeric"
              placeholder="8"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>End hour (0-23)</Text>
            <TextInput
              style={styles.input}
              value={endHour}
              onChangeText={setEndHour}
              keyboardType="numeric"
              placeholder="18"
              placeholderTextColor={colors.textMuted}
            />
            <Text style={[styles.label, { marginTop: 12 }]}>Interval minutes</Text>
            <TextInput
              style={styles.input}
              value={intervalMinutes}
              onChangeText={setIntervalMinutes}
              keyboardType="numeric"
              placeholder="60"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        {type === 'calculator' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Calculator settings</Text>
            <Text style={styles.label}>Input labels</Text>
            <View style={styles.calcRow}>
              <TextInput style={[styles.input, styles.calcInput]} value={calcA} onChangeText={setCalcA} />
              <TextInput style={[styles.input, styles.calcInput]} value={calcB} onChangeText={setCalcB} />
              <TextInput style={[styles.input, styles.calcInput]} value={calcC} onChangeText={setCalcC} />
            </View>
            <Text style={[styles.label, { marginTop: 12 }]}>Formula</Text>
            <Text style={styles.hint}>Allowed: numbers, a/b/c, + - * / ** and parentheses</Text>
            <TextInput
              style={styles.input}
              value={formula}
              onChangeText={setFormula}
              placeholder="(a * (1 + b/100) ** c)"
              placeholderTextColor={colors.textMuted}
            />
          </View>
        )}

        {/* Preview */}
        <View style={styles.section}>
          <Text style={styles.label}>Preview</Text>
          <View style={styles.previewContainer}>{renderOracle(previewConfig)}</View>
        </View>

        {/* Save */}
        <View style={styles.section}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
            <Save size={20} color="#fff" />
            <Text style={styles.buttonText}>Save Oracle</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function clampInt(value: string, min: number, max: number, fallback: number) {
  const n = parseInt(String(value || '').trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function parseNumberList(text: string) {
  const parts = String(text || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const nums = parts
    .map(p => parseFloat(p))
    .filter(n => Number.isFinite(n) && n > 0)
    .slice(0, 8);
  return nums;
}

function useCallbackConfig<T extends (...args: any[]) => any>(fn: T): T {
  // Local helper to avoid importing useCallback just for one stable function; keeps deps explicit above.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return React.useMemo(() => fn, [fn]) as any;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  hint: {
    fontSize: 14,
    color: colors.textMuted,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  textArea: {
    backgroundColor: colors.inputBackground,
    borderRadius: 12,
    padding: 16,
    color: colors.text,
    fontSize: 16,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.inputBorder,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  exampleChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  exampleText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  previewContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 420,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  typeRow: { flexDirection: 'row', marginTop: 6 },
  typeChip: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    marginRight: 10,
  },
  typeChipActive: { borderColor: colors.accent },
  typeText: { color: colors.textMuted, fontSize: 12, fontWeight: '800' },
  typeTextActive: { color: colors.accent },
  calcRow: { flexDirection: 'row', marginTop: 8 },
  calcInput: { flex: 1, marginRight: 8 },
});
