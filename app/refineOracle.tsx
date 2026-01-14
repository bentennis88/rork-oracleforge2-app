import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity, Modal, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useOracles, Oracle } from '@/contexts/OraclesContext';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { generateOracleCode } from '@/services/oracleCodeGenerator';
import firebaseService from '@/services/firebaseService';

export default function RefineOracleScreen() {
  const router = useRouter();
  const { oracles } = useOracles();
  const params = useLocalSearchParams<{ oracleId?: string }>();
  const oracleId = params.oracleId;

  const [oracle, setOracle] = useState<Oracle | null>(null);
  const { updateOracle } = useOracles();
  const { user } = useAuth();

  const [isRefineModalVisible, setRefineModalVisible] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState('');
  const [isRefining, setIsRefining] = useState(false);

  useEffect(() => {
    if (oracleId) {
      const found = oracles.find(o => o.id === oracleId);
      if (found) {
        setOracle(found);
      }
    }
  }, [oracleId, oracles]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/index');
    }
  };

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
        <TouchableOpacity
          onPress={() => setRefineModalVisible(true)}
          style={styles.topBtn}
          activeOpacity={0.85}
        >
          <Text style={{ color: colors.text, fontWeight: '600' }}>Refine</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.oracleContainer}>
        <DynamicOracleRenderer code={oracle.generatedCode} />
      </View>

      <Modal visible={isRefineModalVisible} animationType="slide" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalContainer}
        >
          <View style={styles.modalContent}>
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

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.homeButton]}
                onPress={() => {
                  setRefineModalVisible(false);
                  setRefineFeedback('');
                }}
                activeOpacity={0.85}
              >
                <Text style={[styles.buttonText, styles.homeButtonText]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.refineButton]}
                onPress={async () => {
                  const feedback = refineFeedback.trim();
                  if (!feedback) {
                    Alert.alert('No feedback', 'Please enter refinement notes');
                    return;
                  }
                  setIsRefining(true);
                  try {
                    const originalPrompt = oracle.title + (oracle.description ? '. ' + oracle.description : '');
                    const newPrompt = originalPrompt + ' ' + feedback;
                    const newCode = await generateOracleCode(newPrompt);

                    // Update local context
                    const updated: Oracle = { ...oracle, generatedCode: newCode, updatedAt: Date.now() };
                    updateOracle(updated);

                    // Persist to Firebase if we have an oracleId and authenticated user
                    if (oracleId && user?.id) {
                      try {
                        await firebaseService.updateOracle(oracleId, { generatedCode: newCode });
                      } catch (e) {
                        console.warn('[RefineOracle] Failed to persist to Firebase:', e);
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
                }}
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
});
