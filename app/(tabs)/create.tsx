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
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Sparkles, Wand2, Save } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useOracles } from '@/contexts/OracleContext';
import colors from '@/constants/colors';
import { renderOracle } from '@/oracles/registry';
import type { OracleConfig } from '@/oracles/types';
import { generateOracleConfig } from '@/services/grokApi';

export default function CreateScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { user, isAuthenticated } = useAuth();
  const { createOracle } = useOracles();

  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [config, setConfig] = useState<OracleConfig | null>(null);
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);

  const examples = [
    'Daily water intake tracker with quick add buttons and a weekly chart',
    'Workout tracker: log sets, track streak, and show last 14 days in a chart',
    'Simple calculator: savings projection with principal, rate, years',
    'Daily reminder: check in every hour between 8am and 6pm',
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Enter a prompt');
      return;
    }

    setIsGenerating(true);
    setConfig(null);

    try {
      const result = await generateOracleConfig(prompt.trim(), conversationHistory as any);
      setConfig(result.config);
      setConversationHistory(result.conversationHistory as any);

      // If signed in, persist immediately and jump to the oracle run screen.
      if (isAuthenticated && user?.id) {
        const created = await createOracle(result.config);
        if (created) {
          router.replace('/oracle/' + created.id);
          return;
        }
      }

      // Otherwise, scroll to preview (still renders immediately).
      setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (e: any) {
      Alert.alert('Generation failed', e?.message || 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign in required', 'Please sign in to save oracles', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Go to Profile', onPress: () => router.push('/(tabs)/profile') },
      ]);
      return;
    }

    if (!config) {
      Alert.alert('Error', 'Generate an oracle first');
      return;
    }

    try {
      const created = await createOracle(config);
      if (!created) {
        throw new Error('Failed to create oracle');
      }

      router.replace('/oracle/' + created.id);
    } catch (error: any) {
      Alert.alert('Save Failed', error.message);
      console.error('[Create] Save error:', error);
    }
  };

  const previewConfig = useMemo(() => {
    if (!config) return null;
    // Render using a stable preview id so TrackerOracle persistence doesn't collide with saved instances.
    return { ...(config as any), id: 'preview' } as OracleConfig;
  }, [config]);

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
          <Text style={styles.subtitle}>Describe what you want — we generate a typed config (no code)</Text>
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
                  setPrompt(ex);
                  setTimeout(() => scrollViewRef.current?.scrollTo({ y: 220, animated: true }), 50);
                }}
              >
                <Text style={styles.exampleText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Prompt */}
        <View style={styles.section}>
          <Text style={styles.label}>Prompt</Text>
          <TextInput
            style={styles.textArea}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="E.g., Daily water tracker with quick add buttons and a 14-day chart"
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
          />

          <TouchableOpacity
            style={[styles.button, styles.generateButton, isGenerating && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
            activeOpacity={0.85}
          >
            {isGenerating ? (
              <ActivityIndicator color={colors.background} />
            ) : (
              <>
                <Wand2 size={18} color={colors.background} />
                <Text style={styles.buttonText}>Generate</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Preview */}
        {previewConfig && (
          <View style={styles.section}>
            <Text style={styles.label}>Preview</Text>
            <View style={styles.previewContainer}>{renderOracle(previewConfig)}</View>

            {/* Save */}
            <TouchableOpacity
              style={[styles.button, styles.saveButton, !isAuthenticated && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={!isAuthenticated}
              activeOpacity={0.85}
            >
              <Save size={18} color={colors.background} />
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
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
  generateButton: { backgroundColor: colors.accent },
  saveButton: { backgroundColor: colors.accent },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '800',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  exampleChip: {
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    maxWidth: 280,
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
});
