import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useOracles, Oracle, OracleConfig } from '@/contexts/OraclesContext';
import { renderOracle } from '@/oracles/registry';
import colors from '@/constants/colors';
import { ArrowLeft, Save, X, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';

export default function RefineOracleScreen() {
  const router = useRouter();
  const { oracles, updateOracle } = useOracles();
  const params = useLocalSearchParams<{ oracleId?: string }>();
  const oracleId = params.oracleId;

  const [oracle, setOracle] = useState<Oracle | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);
  const [title, setTitle] = useState('');
  
  // Tracker state
  const [metric, setMetric] = useState('');
  const [unit, setUnit] = useState('');
  const [dailyGoal, setDailyGoal] = useState('');
  
  // Reminder state
  const [message, setMessage] = useState('');
  const [startHour, setStartHour] = useState('');
  const [endHour, setEndHour] = useState('');
  const [interval, setInterval] = useState('');
  
  // Calculator state
  const [formula, setFormula] = useState('');
  const [inputs, setInputs] = useState<{ key: string; label: string }[]>([]);

  useEffect(() => {
    if (oracleId) {
      const found = oracles.find(o => o.id === oracleId);
      if (found) {
        setOracle(found);
        setTitle(found.title);
        
        const { config } = found;
        
        if (config.type === 'tracker') {
          setMetric(config.metric);
          setUnit(config.unit);
          setDailyGoal(String(config.dailyGoal));
        } else if (config.type === 'reminder') {
          setMessage(config.message);
          setStartHour(String(config.startHour));
          setEndHour(String(config.endHour));
          setInterval(String(config.interval));
        } else if (config.type === 'calculator') {
          setFormula(config.formula);
          setInputs(config.inputs);
        }
      }
    }
  }, [oracleId, oracles]);

  const handleSave = () => {
    if (!oracle) return;

    if (!title.trim()) {
      Alert.alert('Validation Error', 'Title is required');
      return;
    }

    let updatedConfig: OracleConfig;

    if (oracle.config.type === 'tracker') {
      if (!metric.trim() || !unit.trim() || !dailyGoal.trim()) {
        Alert.alert('Validation Error', 'All tracker fields are required');
        return;
      }
      updatedConfig = {
        type: 'tracker',
        metric: metric.trim(),
        unit: unit.trim(),
        dailyGoal: parseFloat(dailyGoal) || 0,
      };
    } else if (oracle.config.type === 'reminder') {
      if (!message.trim() || !startHour.trim() || !endHour.trim() || !interval.trim()) {
        Alert.alert('Validation Error', 'All reminder fields are required');
        return;
      }
      updatedConfig = {
        type: 'reminder',
        message: message.trim(),
        startHour: parseInt(startHour) || 0,
        endHour: parseInt(endHour) || 0,
        interval: parseInt(interval) || 0,
      };
    } else if (oracle.config.type === 'calculator') {
      if (!formula.trim() || inputs.length === 0) {
        Alert.alert('Validation Error', 'Formula and at least one input are required');
        return;
      }
      updatedConfig = {
        type: 'calculator',
        formula: formula.trim(),
        inputs: inputs.filter(inp => inp.key.trim() && inp.label.trim()),
      };
    } else {
      Alert.alert('Error', 'Unknown oracle type');
      return;
    }

    const updatedOracle: Oracle = {
      ...oracle,
      title: title.trim(),
      config: updatedConfig,
    };

    updateOracle(updatedOracle);

    Alert.alert('Success', 'Oracle updated successfully', [
      {
        text: 'OK',
        onPress: () => {
          if (router.canGoBack()) {
            router.back();
          } else {
            router.replace('/(tabs)/index');
          }
        },
      },
    ]);
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/index');
    }
  };

  const addInput = () => {
    setInputs([...inputs, { key: '', label: '' }]);
  };

  const updateInput = (index: number, field: 'key' | 'label', value: string) => {
    const newInputs = [...inputs];
    newInputs[index][field] = value;
    setInputs(newInputs);
  };

  const removeInput = (index: number) => {
    setInputs(inputs.filter((_, i) => i !== index));
  };

  if (!oracle) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Oracle not found</Text>
          <TouchableOpacity style={styles.button} onPress={handleCancel} activeOpacity={0.85}>
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleCancel} style={styles.topBtn} activeOpacity={0.85}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Edit Oracle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Live Oracle Preview */}
        <View style={styles.oraclePreview}>
          {renderOracle(oracle.config)}
        </View>

        {/* Toggle Edit Form */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={() => setShowEditForm(!showEditForm)}
          activeOpacity={0.7}
        >
          {showEditForm ? <ChevronUp size={20} color={colors.accent} /> : <ChevronDown size={20} color={colors.accent} />}
          <Text style={styles.toggleText}>
            {showEditForm ? 'Hide' : 'Show'} Configuration
          </Text>
        </TouchableOpacity>

        {showEditForm && (
          <>
            <View style={styles.typeTag}>
              <Text style={styles.typeTagText}>{oracle.config.type.toUpperCase()}</Text>
            </View>

        <View style={styles.form}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Oracle title"
            placeholderTextColor={colors.textMuted}
          />

          {oracle.config.type === 'tracker' && (
            <>
              <Text style={styles.label}>Metric</Text>
              <TextInput
                style={styles.input}
                value={metric}
                onChangeText={setMetric}
                placeholder="e.g., water, steps, workouts"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Unit</Text>
              <TextInput
                style={styles.input}
                value={unit}
                onChangeText={setUnit}
                placeholder="e.g., ml, steps, reps"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Daily Goal</Text>
              <TextInput
                style={styles.input}
                value={dailyGoal}
                onChangeText={setDailyGoal}
                placeholder="e.g., 2000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </>
          )}

          {oracle.config.type === 'reminder' && (
            <>
              <Text style={styles.label}>Message</Text>
              <TextInput
                style={styles.input}
                value={message}
                onChangeText={setMessage}
                placeholder="e.g., Take medication"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Start Hour (0-23)</Text>
              <TextInput
                style={styles.input}
                value={startHour}
                onChangeText={setStartHour}
                placeholder="e.g., 8"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.label}>End Hour (0-23)</Text>
              <TextInput
                style={styles.input}
                value={endHour}
                onChangeText={setEndHour}
                placeholder="e.g., 20"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <Text style={styles.label}>Interval (minutes)</Text>
              <TextInput
                style={styles.input}
                value={interval}
                onChangeText={setInterval}
                placeholder="e.g., 480 (8 hours)"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />
            </>
          )}

          {oracle.config.type === 'calculator' && (
            <>
              <Text style={styles.label}>Formula</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formula}
                onChangeText={setFormula}
                placeholder="e.g., principal * (1 + rate) ^ years"
                placeholderTextColor={colors.textMuted}
                multiline
              />

              <View style={styles.inputsSection}>
                <View style={styles.inputsHeader}>
                  <Text style={styles.label}>Calculator Inputs</Text>
                  <TouchableOpacity onPress={addInput} style={styles.addInputBtn} activeOpacity={0.85}>
                    <Plus size={16} color={colors.accent} />
                    <Text style={styles.addInputText}>Add Input</Text>
                  </TouchableOpacity>
                </View>

                {inputs.map((input, index) => (
                  <View key={index} style={styles.inputRow}>
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      value={input.key}
                      onChangeText={(text) => updateInput(index, 'key', text)}
                      placeholder="Variable key"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TextInput
                      style={[styles.input, styles.inputHalf]}
                      value={input.label}
                      onChangeText={(text) => updateInput(index, 'label', text)}
                      placeholder="Display label"
                      placeholderTextColor={colors.textMuted}
                    />
                    <TouchableOpacity onPress={() => removeInput(index)} style={styles.removeBtn}>
                      <Trash2 size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </>
          )}

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleCancel}
              activeOpacity={0.85}
            >
              <X size={18} color={colors.text} />
              <Text style={[styles.buttonText, styles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.85}
            >
              <Save size={18} color={colors.background} />
              <Text style={styles.buttonText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  typeTag: {
    alignSelf: 'flex-start',
    backgroundColor: colors.accent + '20',
    borderWidth: 1,
    borderColor: colors.accent + '40',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 24,
  },
  typeTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
    letterSpacing: 0.5,
  },
  oraclePreview: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    overflow: 'hidden',
    marginBottom: 16,
    minHeight: 200,
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    marginBottom: 16,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.accent,
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
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
    minHeight: 80,
    textAlignVertical: 'top',
  },
  inputsSection: {
    gap: 12,
  },
  inputsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  addInputBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '40',
  },
  addInputText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputHalf: {
    flex: 1,
  },
  removeBtn: {
    padding: 8,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  cancelButtonText: {
    color: colors.text,
  },
  saveButton: {
    backgroundColor: colors.accent,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  empty: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 20,
  },
});
