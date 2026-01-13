import React, { useState, useRef } from 'react';
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
import { Wand2, Save, RefreshCw, Sparkles } from 'lucide-react-native';
import { generateOracleCode, refineOracleCode } from '@/services/grokApi';
import { useAuth } from '@/contexts/AuthContext';
import { useOracles } from '@/contexts/OracleContext';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import colors from '@/constants/colors';

export default function CreateScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { user, isAuthenticated } = useAuth();
  const { createOracle, updateOracle } = useOracles();

  const [prompt, setPrompt] = useState('');
  const [refinementFeedback, setRefinementFeedback] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [conversationHistory, setConversationHistory] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [oracleName, setOracleName] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      Alert.alert('Error', 'Please describe your oracle');
      return;
    }

    setIsGenerating(true);
    setShowPreview(false);

    try {
      console.log('[Create] Generating oracle...');
      const result = await generateOracleCode(prompt, []);

      console.log('[Create] Code generated, length:', result.code.length);
      setGeneratedCode(result.code);
      setConversationHistory(result.conversationHistory);
      setShowPreview(true);

      // Auto-generate name
      const words = prompt.split(' ').slice(0, 3);
      const autoName = words
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
      setOracleName(autoName);

      // Scroll to preview
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error: any) {
      Alert.alert('Generation Failed', error.message);
      console.error('[Create] Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinementFeedback.trim()) {
      Alert.alert('Error', 'Please provide refinement feedback');
      return;
    }

    if (!generatedCode) {
      Alert.alert('Error', 'Generate an oracle first');
      return;
    }

    setIsRefining(true);
    setShowPreview(false);

    try {
      console.log('[Create] Refining oracle...');
      const result = await refineOracleCode(generatedCode, refinementFeedback, conversationHistory);

      console.log('[Create] Refinement complete');
      setGeneratedCode(result.code);
      setConversationHistory(result.conversationHistory);
      setRefinementFeedback('');
      setShowPreview(true);

      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 300);
    } catch (error: any) {
      Alert.alert('Refinement Failed', error.message);
      console.error('[Create] Refinement error:', error);
    } finally {
      setIsRefining(false);
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

    if (!generatedCode) {
      Alert.alert('Error', 'Generate an oracle before saving');
      return;
    }

    if (!oracleName.trim()) {
      Alert.alert('Error', 'Please provide a name');
      return;
    }

    try {
      const created = await createOracle(prompt.trim(), oracleName.trim(), generatedCode);
      if (!created) {
        throw new Error('Failed to create oracle');
      }

      await updateOracle(created.id, { conversationHistory });

      Alert.alert('Success!', 'Your oracle has been saved', [
        {
          text: 'View Dashboard',
          onPress: () => router.push('/(tabs)'),
        },
        {
          text: 'Create Another',
          onPress: () => {
            setPrompt('');
            setRefinementFeedback('');
            setGeneratedCode('');
            setConversationHistory([]);
            setShowPreview(false);
            setOracleName('');
          },
        },
      ]);
    } catch (error: any) {
      Alert.alert('Save Failed', error.message);
      console.error('[Create] Save error:', error);
    }
  };

  const examplePrompts = [
    'Water intake tracker with reminders',
    'Workout streak tracker',
    'Shopping list with categories',
    'Daily mood journal',
    'Habit tracker with charts',
  ];

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
          <Text style={styles.subtitle}>Describe any tool you need</Text>
        </View>

        {/* Example Prompts */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💡 Examples</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {examplePrompts.map((example, index) => (
              <TouchableOpacity
                key={index}
                style={styles.exampleChip}
                onPress={() => setPrompt(example)}
              >
                <Text style={styles.exampleText}>{example}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Main Prompt */}
        <View style={styles.section}>
          <Text style={styles.label}>Describe Your Oracle</Text>
          <TextInput
            style={styles.textArea}
            value={prompt}
            onChangeText={setPrompt}
            placeholder="E.g., Daily water tracker with hourly reminders and weekly chart..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            editable={!isGenerating}
          />

          <TouchableOpacity
            style={[styles.button, styles.generateButton, isGenerating && styles.buttonDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Wand2 size={20} color="#fff" />
                <Text style={styles.buttonText}>Generate Oracle</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Refinement */}
        {generatedCode && (
          <View style={styles.section}>
            <Text style={styles.label}>Refine Your Oracle</Text>
            <Text style={styles.hint}>Ask for changes like "Add dark mode" or "Make buttons bigger"</Text>
            <TextInput
              style={styles.textArea}
              value={refinementFeedback}
              onChangeText={setRefinementFeedback}
              placeholder="E.g., Add a dark mode toggle, make the buttons larger..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={3}
              editable={!isRefining}
            />

            <TouchableOpacity
              style={[styles.button, styles.refineButton, isRefining && styles.buttonDisabled]}
              onPress={handleRefine}
              disabled={isRefining}
            >
              {isRefining ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <RefreshCw size={20} color="#fff" />
                  <Text style={styles.buttonText}>Refine</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Preview */}
        {showPreview && generatedCode && (
          <View style={styles.section}>
            <Text style={styles.label}>Preview</Text>
            <View style={styles.previewContainer}>
              <DynamicOracleRenderer
                code={generatedCode}
                userId={user?.id || 'preview-user'}
                oracleId="preview"
                data={{}}
                onError={(error) => {
                  console.error('[Create] Preview error:', error);
                }}
              />
            </View>
          </View>
        )}

        {/* Save */}
        {generatedCode && (
          <View style={styles.section}>
            <Text style={styles.label}>Oracle Name</Text>
            <TextInput
              style={styles.input}
              value={oracleName}
              onChangeText={setOracleName}
              placeholder="My Awesome Oracle"
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
              <Save size={20} color="#fff" />
              <Text style={styles.buttonText}>Save Oracle</Text>
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
    gap: 8,
  },
  generateButton: {
    backgroundColor: colors.accent,
  },
  refineButton: {
    backgroundColor: '#3b82f6',
  },
  saveButton: {
    backgroundColor: '#8b5cf6',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    height: 400,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
});
