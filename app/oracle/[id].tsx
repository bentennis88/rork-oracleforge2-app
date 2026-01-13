import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { ArrowLeft, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import { renderOracle } from '@/oracles/registry';
import { useOracleStore } from '@/oracles/OracleStore';

export default function OracleDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { oracles, deleteOracle } = useOracleStore();

  const oracle = useMemo(() => oracles.find(o => o.id === id), [id, oracles]);
  const safeBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleDelete = () => {
    if (!oracle) return;
    Alert.alert('Delete Oracle', 'Are you sure you want to delete this oracle? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteOracle(oracle.id);
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (!oracle) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Oracle not found</Text>
          <TouchableOpacity style={styles.backBtn} onPress={safeBack} activeOpacity={0.85}>
            <ArrowLeft size={18} color={colors.text} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topBar}>
        <TouchableOpacity onPress={safeBack} style={styles.topBtn} activeOpacity={0.85}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.topTitle} numberOfLines={1}>
          {String((oracle as any)?.config?.title || 'Oracle')}
        </Text>
        <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn} activeOpacity={0.85}>
          <Trash2 size={18} color={colors.error} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.previewCard}>{renderOracle((oracle as any).config)}</View>
        {(oracle as any)?.config?.description ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>About</Text>
            <Text style={styles.infoText}>{String((oracle as any).config.description)}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
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
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
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

