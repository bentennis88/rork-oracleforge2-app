import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useOracles } from '@/contexts/OraclesContext';
import colors from '@/constants/colors';
import { ArrowLeft, Save, X } from 'lucide-react-native';

export default function RefineOracleScreen() {
  const router = useRouter();
  const { oracles, updateOracle } = useOracles();
  const params = useLocalSearchParams<{ oracleId?: string }>();
  const oracleId = params.oracleId;

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');

  useEffect(() => {
    if (oracleId) {
      const oracle = oracles.find(o => o.id === oracleId);
      if (oracle) {
        setTitle(oracle.title);
        setCategory(oracle.category);
        setContent(oracle.content);
      }
    }
  }, [oracleId, oracles]);

  const handleSave = () => {
    if (!title.trim() || !category.trim() || !content.trim()) {
      Alert.alert('Validation Error', 'All fields are required');
      return;
    }

    if (!oracleId) {
      Alert.alert('Error', 'Oracle ID is missing');
      return;
    }

    updateOracle({
      id: oracleId,
      title: title.trim(),
      category: category.trim(),
      content: content.trim(),
    });

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
        <Text style={styles.topTitle}>Refine Oracle</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
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
});
