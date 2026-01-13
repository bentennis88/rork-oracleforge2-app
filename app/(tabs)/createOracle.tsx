import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useOracles, Oracle } from '@/contexts/OraclesContext';
import { generateOracleCode } from '@/services/oracleCodeGenerator';
import colors from '@/constants/colors';
import { Sparkles, Home, Edit3, Wand2 } from 'lucide-react-native';

export default function CreateOracleScreen() {
  const router = useRouter();
  const { addOracle } = useOracles();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [created, setCreated] = useState(false);
  const [newOracleId, setNewOracleId] = useState<string | null>(null);

  const generateId = () => {
    return 'oracle_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  };

  const handleGenerate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please enter a title for your oracle');
      return;
    }

    setIsGenerating(true);

    try {
      // Combine title and description into a prompt for the AI
      const prompt = description.trim()
        ? `${title.trim()}. ${description.trim()}`
        : title.trim();

      console.log('[CreateOracle] Sending prompt to AI:', prompt);

      // Call AI Code Generator to generate full React Native component
      const generatedCode = await generateOracleCode(prompt);

      console.log('[CreateOracle] Received code, length:', generatedCode.length);

      // Create oracle with AI-generated code
      const oracleId = generateId();
      const now = Date.now();
      const newOracle: Oracle = {
        id: oracleId,
        title: title.trim(),
        description: description.trim() || undefined,
        generatedCode,
        createdAt: now,
        updatedAt: now,
      };

      addOracle(newOracle);
      setCreated(true);
      setNewOracleId(newOracle.id);

      console.log('[CreateOracle] Oracle created successfully:', newOracle.id);
    } catch (error: any) {
      console.error('[CreateOracle] Generation failed:', error);
      Alert.alert(
        'Generation Failed',
        error.message || 'Failed to generate oracle. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setTitle('');
    setDescription('');
    setCreated(false);
    setNewOracleId(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {!created ? (
          <>
            <View style={styles.header}>
              <Wand2 size={32} color={colors.accent} />
              <Text style={styles.title}>Create Oracle</Text>
          <Text style={styles.subtitle}>
            Describe what you want in natural language - AI will generate a custom mini-app
          </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Title</Text>
              <Text style={styles.hint}>What do you want to track, calculate, or be reminded about?</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Track daily water intake"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Description (Optional)</Text>
              <Text style={styles.hint}>Add more details to help the AI understand your intent</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g., I want to drink 2 liters per day and see my progress"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.button, styles.generateButton, isGenerating && styles.buttonDisabled]}
                onPress={handleGenerate}
                disabled={isGenerating}
                activeOpacity={0.85}
              >
                {isGenerating ? (
                  <>
                    <ActivityIndicator size="small" color={colors.background} />
                    <Text style={styles.buttonText}>Generating...</Text>
                  </>
                ) : (
                  <>
                    <Sparkles size={18} color={colors.background} />
                    <Text style={styles.buttonText}>Generate with AI</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={styles.examplesCard}>
                <Text style={styles.examplesTitle}>💡 Example prompts:</Text>
                <Text style={styles.exampleText}>• Track my daily water intake with quick add buttons and a chart</Text>
                <Text style={styles.exampleText}>• Hockey shift tracker with timer for each period</Text>
                <Text style={styles.exampleText}>• Grocery shopping list with categories and checkboxes</Text>
                <Text style={styles.exampleText}>• Workout tracker with exercise sets and rest timer</Text>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successHeader}>
              <Sparkles size={48} color={colors.success} />
              <Text style={styles.successTitle}>Oracle Created!</Text>
              <Text style={styles.successText}>Your custom mini-app is ready to use</Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={() => router.push('/(tabs)/index')}
                activeOpacity={0.85}
              >
                <Home size={18} color={colors.text} />
                <Text style={[styles.buttonText, styles.homeButtonText]}>Go Home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.refineButton]}
                onPress={() => newOracleId && router.push(`/refineOracle?oracleId=${newOracleId}`)}
                activeOpacity={0.85}
              >
                <Edit3 size={18} color={colors.background} />
                <Text style={styles.buttonText}>View/Edit Oracle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.newButton]}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Wand2 size={18} color={colors.background} />
                <Text style={styles.buttonText}>Create Another</Text>
              </TouchableOpacity>
            </View>
          </View>
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
    paddingHorizontal: 20,
    lineHeight: 22,
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
  hint: {
    fontSize: 13,
    color: colors.textSecondary,
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
    minHeight: 100,
    textAlignVertical: 'top',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  generateButton: {
    backgroundColor: colors.accent,
    marginTop: 16,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  examplesCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 16,
    marginTop: 8,
  },
  examplesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  successContainer: {
    flex: 1,
    paddingTop: 60,
  },
  successHeader: {
    alignItems: 'center',
    marginBottom: 48,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.success,
    marginTop: 20,
  },
  successText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 12,
  },
  homeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  homeButtonText: {
    color: colors.text,
  },
  refineButton: {
    backgroundColor: colors.accent,
  },
  newButton: {
    backgroundColor: colors.accentDark,
  },
});
