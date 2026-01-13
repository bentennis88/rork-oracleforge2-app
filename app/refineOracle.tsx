import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useOracles, Oracle } from '@/contexts/OraclesContext';
import DynamicOracleRenderer from '@/components/DynamicOracleRenderer';
import colors from '@/constants/colors';
import { ArrowLeft } from 'lucide-react-native';

export default function RefineOracleScreen() {
  const router = useRouter();
  const { oracles } = useOracles();
  const params = useLocalSearchParams<{ oracleId?: string }>();
  const oracleId = params.oracleId;

  const [oracle, setOracle] = useState<Oracle | null>(null);

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
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.oracleContainer}>
        <DynamicOracleRenderer code={oracle.generatedCode} />
      </View>
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
});
