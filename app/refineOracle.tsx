import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useOracles, Oracle } from '@/contexts/OraclesContext';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import colors from '@/constants/colors';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { generateOracleCode } from '@/services/oracleCodeGenerator';
import firebaseService from '@/services/firebaseService';

export default function RefineOracleScreen() {
  const router = useRouter();
  const { oracles, updateOracle, deleteOracle } = useOracles();
  const params = useLocalSearchParams<{ oracleId?: string }>();
  const oracleId = params.oracleId;

  const [oracle, setOracle] = useState<Oracle | null>(null);
  const { user } = useAuth();

  const [isRefineModalVisible, setRefineModalVisible] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [hasRenderError, setHasRenderError] = useState(false);

  useEffect(() => {
    if (oracleId) {
      const found = oracles.find(o => o.id === oracleId);
      if (found) {
        setOracle(found);
      }
    }
  }, [oracleId, oracles]);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/index');
    }
  }, [router]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Oracle',
      `Are you sure you want to delete "${oracle?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (oracleId) {
              deleteOracle(oracleId);
              // Try to delete from Firebase too
              if (user?.id) {
                try {
                  await firebaseService.deleteOracle(oracleId);
                } catch (e) {
                  console.warn('[RefineOracle] Failed to delete from Firebase:', e);
                }
              }
            }
            handleBack();
          },
        },
      ]
    );
  }, [oracle, oracleId, deleteOracle, handleBack, user]);

  const handleRenderError = useCallback((error: Error) => {
    setHasRenderError(true);
    console.error('[RefineOracle] Oracle render error:', error);
  }, []);

  const handleApplyRefinement = useCallback(async () => {
    const feedback = refineFeedback.trim();
    if (!feedback) {
      Alert.alert('No feedback', 'Please enter refinement notes');
      return;
    }
    setIsRefining(true);
    try {
      const originalPrompt = oracle!.title + (oracle!.description ? '. ' + oracle!.description : '');
      const newPrompt = originalPrompt + ' ' + feedback;
      const newCode = await generateOracleCode(newPrompt);

      // Update local context
      const updated: Oracle = { ...oracle!, generatedCode: newCode, updatedAt: Date.now() };
      updateOracle(updated);

      // Persist to Firebase if we have an oracleId and authenticated user
      if (oracleId && user?.id) {
        try {
          // Try to update, but if doc doesn't exist, save it fresh
          await firebaseService.updateOracle(oracleId, { generatedCode: newCode });
        } catch (e: any) {
          // If the document doesn't exist, save it as a new oracle
          if (e?.code === 'not-found' || e?.message?.includes('No document to update')) {
            try {
              await firebaseService.saveOracle(user.id, updated);
              console.log('[RefineOracle] Created new Firebase doc for oracle:', oracleId);
            } catch (saveErr) {
              console.warn('[RefineOracle] Failed to save new doc to Firebase:', saveErr);
            }
          } else {
            console.warn('[RefineOracle] Failed to persist to Firebase:', e);
          }
        }
      }

      Alert.alert('Refined', 'Oracle updated');
      setRefineModalVisible(false);
      setRefineFeedback('');
    } catch (e: any) {
      console.error('[RefineOracle] Refinement failed:', e);
      Alert.alert('Refinement Failed', e?.message || 'Failed to refine oracle');
    } finally {
      setIsRefining(false);
    }
  }, [refineFeedback, oracle, oracleId, updateOracle, user]);

  if (!oracle) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Oracle not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack} activeOpacity={0.85}>
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.backText}>Go Back</Text>
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
        <TouchableOpacity onPress={handleBack} style={styles.topBtn} activeOpacity={0.85}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {oracle.title}
        </Text>
        <View style={styles.topRightButtons}>
          <TouchableOpacity
            onPress={handleDelete}
            style={[styles.topBtn, styles.deleteBtn]}
            activeOpacity={0.85}
          >
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setRefineModalVisible(true)}
            style={[styles.topBtn, styles.refineTopBtn]}
            activeOpacity={0.85}
          >
            <Text style={[styles.refineTopText]}>Refine</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasRenderError && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorBannerText}>
            This Oracle has errors. Try refining it or delete and create a new one.
          </Text>
        </View>
      )}

      <View style={styles.oracleContainer}>
        <DynamicOracleRenderer code={oracle.generatedCode} onError={handleRenderError} />
      </View>

      <Modal visible={isRefineModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Refine Oracle</Text>
              <Text style={styles.modalHint}>Describe changes or improvements you want</Text>
              <TextInput
                style={styles.modalInput}
                value={refineFeedback}
                onChangeText={setRefineFeedback}
                placeholder="e.g., change color, add a reset button, show weekly chart"
                placeholderTextColor={colors.textSecondary}
                multiline
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalFooterButton, styles.homeButton]}
                onPress={() => {
                  setRefineModalVisible(false);
                  setRefineFeedback('');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.buttonText, styles.homeButtonText]}>Close</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalFooterButton, styles.refineButton]}
                onPress={handleApplyRefinement}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>{isRefining ? 'Refining...' : 'Apply'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  oracleContainer: {
    flex: 1,
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  modalHint: { fontSize: 13, color: colors.textSecondary, marginBottom: 12 },
  modalInput: {
    minHeight: 80,
    backgroundColor: colors.inputBackground,
    color: colors.text,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    marginBottom: 12,
  },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  fullWidthButton: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  modalScrollContent: {
    paddingBottom: 160,
  },
  modalFooter: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    gap: 12,
  },
  modalFooterButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineTopBtn: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineTopText: {
    color: colors.background,
    fontWeight: '700',
  },
  topRightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteBtn: {
    backgroundColor: colors.surface,
    borderColor: colors.error,
  },
  errorBanner: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.error + '40',
  },
  errorBannerText: {
    color: colors.error,
    fontSize: 13,
    textAlign: 'center',
  },
  button: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refineButton: {
    backgroundColor: colors.accent,
  },
  homeButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
  },
  buttonText: {
    color: colors.onAccent || colors.text,
    fontWeight: '700',
  },
  homeButtonText: {
    color: colors.text,
    fontWeight: '600',
  },
});
