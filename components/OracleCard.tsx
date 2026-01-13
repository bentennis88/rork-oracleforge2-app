import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { 
  Zap, Target, TrendingUp, Clock, BarChart3, Activity, 
  ChevronRight, Trash2, RefreshCw, Play,
  Calculator, ListTodo, Bell, DollarSign, Heart, Briefcase, Box,
  ShoppingCart, Droplet, Dumbbell, PieChart, Wallet, CheckSquare,
  Flame, Star, Coffee, Moon, Sun,
} from 'lucide-react-native';
import colors from '@/constants/colors';
import { Oracle, OracleCategory } from '@/types';

const iconMap: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  Zap,
  Target,
  TrendingUp,
  Clock,
  BarChart3,
  Activity,
};

const categoryIcons: Record<OracleCategory, React.ComponentType<{ size: number; color: string }>> = {
  tracker: Activity,
  calculator: Calculator,
  list: ListTodo,
  reminder: Bell,
  finance: DollarSign,
  health: Heart,
  productivity: Briefcase,
  other: Box,
};

const categoryLabels: Record<OracleCategory, string> = {
  tracker: 'Tracker',
  calculator: 'Calculator',
  list: 'List',
  reminder: 'Reminder',
  finance: 'Finance',
  health: 'Health',
  productivity: 'Productivity',
  other: 'Tool',
};

interface OracleCardProps {
  oracle: Oracle;
  onPress: () => void;
  onDelete: () => void;
  onRefine?: () => void;
}

export default function OracleCard({ oracle, onPress, onDelete, onRefine }: OracleCardProps) {
  const IconComponent = iconMap[oracle.icon] || Zap;
  const CategoryIcon = categoryIcons[oracle.category || 'other'];
  const PreviewIcon = CategoryIcon || IconComponent;
  
  const formatDate = (timestamp: number) => {
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
  };

  const logsCount = oracle.logs?.length || 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      testID={`oracle-card-${oracle.id}`}
    >
      <View style={[styles.accentBar, { backgroundColor: oracle.color }]} />
      
      <View style={styles.mainContent}>
        <View style={styles.topRow}>
          <View style={[styles.iconContainer, { backgroundColor: oracle.color + '15' }]}>
            <PreviewIcon size={24} color={oracle.color} />
          </View>
          
          <View style={styles.titleSection}>
            <Text style={styles.name} numberOfLines={1}>{oracle.name}</Text>
            <View style={styles.metaRow}>
              <View style={styles.categoryBadge}>
                <CategoryIcon size={10} color={colors.textMuted} />
                <Text style={styles.categoryText}>{categoryLabels[oracle.category || 'other']}</Text>
              </View>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.date}>{formatDate(oracle.updatedAt)}</Text>
            </View>
          </View>
          
          <View style={styles.actions}>
            {onRefine && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation?.();
                  onRefine();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.actionButton}
              >
                <RefreshCw size={16} color={colors.accent} />
              </TouchableOpacity>
            )}
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
        
        <Text style={styles.description} numberOfLines={2}>{oracle.description}</Text>
        
        <View style={styles.footer}>
          <View style={styles.statsRow}>
            {logsCount > 0 && (
              <View style={styles.statBadge}>
                <Activity size={10} color={colors.accent} />
                <Text style={styles.statText}>{logsCount} logs</Text>
              </View>
            )}
            {oracle.isActive && (
              <View style={[styles.statBadge, styles.activeBadge]}>
                <View style={styles.activeDot} />
                <Text style={[styles.statText, styles.activeText]}>Active</Text>
              </View>
            )}
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
    backgroundColor: colors.surface,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    flexDirection: 'row',
  },
  accentBar: {
    width: 4,
  },
  mainContent: {
    flex: 1,
    padding: 16,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  dot: {
    fontSize: 11,
    color: colors.textMuted,
    marginHorizontal: 6,
  },
  date: {
    fontSize: 11,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  description: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
    marginBottom: 14,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statText: {
    fontSize: 11,
    color: colors.accent,
    fontWeight: '500' as const,
  },
  activeBadge: {
    backgroundColor: colors.success + '15',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  activeText: {
    color: colors.success,
  },
  runButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent + '15',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  runText: {
    fontSize: 12,
    color: colors.accent,
    fontWeight: '600' as const,
  },
});
