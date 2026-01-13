import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ArrowLeft, Save } from 'lucide-react-native';
import colors from '@/constants/colors';
import { renderOracle } from '@/oracles/registry';
import type { OracleConfig } from '@/oracles/types';
import { useOracleStore } from '@/oracles/OracleStore';

export default function PreviewOracleScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ config?: string }>();
  const { createOracle } = useOracleStore();
  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const config = useMemo<OracleConfig | null>(() => {
    if (!params.config) return null;
    try {
      return JSON.parse(params.config) as OracleConfig;
    } catch (e) {
      console.log('[Preview] Error parsing config:', e);
      return null;
    }
  }, [params.config]);

  const handleSave = async () => {
    if (!config) return;
    const created = await createOracle(config.type, { ...(config as any), id: 'draft' } as any);
    router.replace('/oracle/' + created.id);
  };

  if (!config) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No config provided</Text>
          <Text style={styles.emptyText}>Go back and try again.</Text>
          <TouchableOpacity style={styles.backBtn} onPress={safeBack} activeOpacity={0.85}>
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={safeBack} style={styles.topBtn} activeOpacity={0.85}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {config.title}
        </Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn} activeOpacity={0.85}>
          <Save size={18} color={colors.background} />
          <Text style={styles.saveText}>Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.previewCard}>{renderOracle(config)}</View>
        {config.description ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About</Text>
            <Text style={styles.infoText}>{config.description}</Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topBar: {
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
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
  topTitle: { flex: 1, marginHorizontal: 12, color: colors.text, fontSize: 16, fontWeight: '800' },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
  },
  saveText: { marginLeft: 8, color: colors.background, fontWeight: '900' },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  previewCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    overflow: 'hidden',
    minHeight: 420,
  },
  infoCard: {
    marginTop: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
  },
  infoTitle: { color: colors.text, fontWeight: '900', marginBottom: 6 },
  infoText: { color: colors.textMuted, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '900' },
  emptyText: { color: colors.textMuted, marginTop: 6, fontWeight: '600' },
  backBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
  },
  backText: { marginLeft: 8, color: colors.text, fontWeight: '800' },
});

