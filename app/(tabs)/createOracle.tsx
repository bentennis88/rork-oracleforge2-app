import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useOracles, Oracle } from '@/contexts/OraclesContext';
import colors from '@/constants/colors';
import { Sparkles, Home, Edit3 } from 'lucide-react-native';

export default function CreateOracleScreen() {
  const router = useRouter();
  const { addOracle } = useOracles();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [created, setCreated] = useState(false);
  const [newOracleId, setNewOracleId] = useState<string | null>(null);

  const generateId = () => {
    return 'oracle_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
  };

  const handleCreate = () => {
    if (!title.trim() || !category.trim() || !content.trim()) {
      return;
    }

    const newOracle: Oracle = {
      id: generateId(),
      title: title.trim(),
      category: category.trim(),
      content: content.trim(),
    };
    
    addOracle(newOracle);
    setCreated(true);
    setNewOracleId(newOracle.id);
  };

  const handleReset = () => {
    setTitle('');
    setCategory('');
    setContent('');
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
              <Sparkles size={32} color={colors.accent} />
              <Text style={styles.title}>Create Oracle</Text>
              <Text style={styles.subtitle}>Fill in the details to create a new oracle</Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Enter oracle title"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={category}
                onChangeText={setCategory}
                placeholder="Enter category"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={styles.label}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={content}
                onChangeText={setContent}
                placeholder="Enter oracle content"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              <TouchableOpacity
                style={[styles.button, styles.createButton]}
                onPress={handleCreate}
                activeOpacity={0.85}
              >
                <Sparkles size={18} color={colors.background} />
                <Text style={styles.buttonText}>Create Oracle</Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successHeader}>
              <Sparkles size={48} color={colors.success} />
              <Text style={styles.successTitle}>Oracle Created!</Text>
              <Text style={styles.successText}>Your oracle has been saved successfully</Text>
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
                <Text style={styles.buttonText}>Refine Oracle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.newButton]}
                onPress={handleReset}
                activeOpacity={0.85}
              >
                <Sparkles size={18} color={colors.background} />
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
  },
  form: {
    gap: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
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
    minHeight: 120,
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
  createButton: {
    backgroundColor: colors.accent,
    marginTop: 16,
  },
  buttonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
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
