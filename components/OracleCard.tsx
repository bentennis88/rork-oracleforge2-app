import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity, Bell, Calculator, ChevronRight, Play, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import type { Oracle } from '@/oracles/OracleStore';

const typeIcons: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  tracker: Activity,
  reminder: Bell,
  calculator: Calculator,
};

const typeLabels: Record<string, string> = {
  tracker: 'Tracker',
  reminder: 'Reminder',
  calculator: 'Calculator',
};

interface OracleCardProps {
  oracle: Oracle;
  onPress: () => void;
  onDelete: () => void;
}

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return diffMins === 0 ? 'Just now' : `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function OracleCard({ oracle, onPress, onDelete }: OracleCardProps) {
  const cfg: any = oracle.config || {};
  const title = typeof cfg.title === 'string' && cfg.title.trim().length ? cfg.title : 'Oracle';
  const description = typeof cfg.description === 'string' ? cfg.description : '';

  const type = String(oracle.type || cfg.type || 'tracker');
  const Icon = typeIcons[type] || Activity;
  const typeLabel = typeLabels[type] || 'Oracle';

  const accent = useMemo(() => {
    if (type === 'reminder') return colors.warning;
    if (type === 'calculator') return '#8b5cf6';
    return colors.accent;
  }, [type]);

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7} testID={`oracle-card-${oracle.id}`}>
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      <View style={styles.mainContent}>
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, { backgroundColor: accent + '15' }]}>
            <Icon size={24} color={accent} />
          </View>

          <View style={styles.titleSection}>
            <Text style={styles.name} numberOfLines={1}>
              {title}
            </Text>
            <View style={styles.metaRow}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeText}>{typeLabel}</Text>
              </View>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.date}>{formatDate(oracle.createdAt)}</Text>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                onDelete();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.actionButton}
            >
              <Trash2 size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.description} numberOfLines={2}>
          {description}
        </Text>

        <View style={styles.footer}>
          <View style={[styles.statBadge, styles.savedBadge]}>
            <View style={styles.savedDot} />
            <Text style={[styles.statText, styles.savedText]}>Saved</Text>
          </View>

          <View style={styles.runButton}>
            <Play size={12} color={colors.accent} fill={colors.accent} />
            <Text style={styles.runText}>Run</Text>
            <ChevronRight size={14} color={colors.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorder,
    flexDirection: 'row',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  accentBar: { width: 4 },
  mainContent: { flex: 1, padding: 16 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleSection: { flex: 1, marginRight: 8 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center' },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  typeText: { fontSize: 11, color: colors.textMuted, fontWeight: '800' },
  dot: { fontSize: 11, color: colors.textMuted, marginHorizontal: 6 },
  date: { fontSize: 11, color: colors.textMuted },
  actions: { flexDirection: 'row' },
  actionButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: { fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 14 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceLight,
  },
  statText: { fontSize: 11, fontWeight: '800' },
  savedBadge: { backgroundColor: colors.successLight + '30', borderColor: colors.success + '50' },
  savedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success, marginRight: 6 },
  savedText: { color: colors.successDark },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentMuted,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  runText: { fontSize: 12, color: colors.accent, fontWeight: '800', marginHorizontal: 4 },
});

