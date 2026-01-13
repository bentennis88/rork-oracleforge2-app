import React, { useState, useMemo, useCallback, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { 
  Hexagon, Plus, Search, X, 
  Activity, Calculator, ListTodo, Bell, DollarSign, Heart, Briefcase, Box,
  RefreshCw, Sparkles, Wand2,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useOracleStore } from '@/oracles/OracleStore';
import OracleCard from '@/components/OracleCard';
import Onboarding from '@/components/Onboarding';

const categories: { key: string; label: string; icon: React.ComponentType<{ size: number; color: string }> }[] = [
  { key: 'all', label: 'All', icon: Box },
  { key: 'tracker', label: 'Trackers', icon: Activity },
  { key: 'calculator', label: 'Calculators', icon: Calculator },
  { key: 'reminder', label: 'Reminders', icon: Bell },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, isAuthenticated, hasCompletedOnboarding, completeOnboarding, isPro } = useAuth();
  const { oracles, deleteOracle } = useOracleStore();
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [toast, setToast] = useState({ visible: false, message: '' });

  const toastAnim = useRef(new Animated.Value(0)).current;

  const filteredOracles = useMemo(() => {
    let result = oracles;
    
    if (selectedCategory !== 'all') {
      result = result.filter(o => String((o as any).type || (o as any)?.config?.type || '') === selectedCategory);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(o => 
        String((o as any)?.config?.title || '').toLowerCase().includes(query) ||
        String((o as any)?.config?.description || '').toLowerCase().includes(query)
      );
    }
    
    return result;
  }, [oracles, selectedCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: oracles.length };
    oracles.forEach(o => {
      const t = String((o as any).type || (o as any)?.config?.type || 'tracker');
      counts[t] = (counts[t] || 0) + 1;
    });
    return counts;
  }, [oracles]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const handleOraclePress = (oracleId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/oracle/${oracleId}` as const);
  };

  const handleDeleteOracle = (oracleId: string) => {
    if (Platform.OS === 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      showToast('Oracle deleted');
      deleteOracle(oracleId);
    } else {
      Alert.alert(
        'Delete Oracle',
        'Are you sure you want to delete this oracle?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Delete', 
            style: 'destructive',
            onPress: () => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              showToast('Oracle deleted');
              deleteOracle(oracleId);
            }
          },
        ]
      );
    }
  };

  const showToast = useCallback((message: string) => {
    setToast({ visible: true, message });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToast({ visible: false, message: '' }));
  }, [toastAnim]);

  // AI refinement has been disabled (no runtime transpile/eval).

  if (!hasCompletedOnboarding) {
    return <Onboarding onComplete={completeOnboarding} />;
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <View style={styles.emptyIconContainer}>
            <Hexagon size={56} color={colors.accent} strokeWidth={1} />
          </View>
          <Text style={styles.emptyTitle}>Welcome to OracleForge</Text>
          <Text style={styles.emptyText}>
            Build custom tools, trackers, and utilities using natural language
          </Text>
          <TouchableOpacity 
            style={styles.signInButton}
            onPress={() => router.push('/(tabs)/profile')}
          >
            <Text style={styles.signInButtonText}>Get Started</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>
                Hello, {user?.displayName?.split(' ')[0] || 'Creator'}
              </Text>
              <Text style={styles.subtitle}>
                {oracles.length === 0 
                  ? 'Create your first oracle' 
                  : `${oracles.length} oracle${oracles.length !== 1 ? 's' : ''} ready`}
              </Text>
            </View>
            {isPro && (
              <View style={styles.proBadge}>
                <Sparkles size={12} color="#FFB800" />
                <Text style={styles.proText}>PRO</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchInputWrapper}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search oracles..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesScroll}
          contentContainerStyle={styles.categoriesContent}
        >
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.key;
            const count = categoryCounts[cat.key] || 0;
            const IconComp = cat.icon;
            return (
              <TouchableOpacity
                key={cat.key}
                style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedCategory(cat.key);
                }}
              >
                <IconComp size={14} color={isSelected ? colors.background : colors.textSecondary} />
                <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                  {cat.label}
                </Text>
                {count > 0 && (
                  <View style={[styles.countBadge, isSelected && styles.countBadgeActive]}>
                    <Text style={[styles.countText, isSelected && styles.countTextActive]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {oracles.length === 0 ? (
          <View style={styles.emptyOracles}>
            <View style={styles.emptyOraclesIcon}>
              <Wand2 size={36} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyOraclesTitle}>No Oracles Yet</Text>
            <Text style={styles.emptyOraclesText}>
              Describe any tool in natural language and I&apos;ll build it for you
            </Text>
            <TouchableOpacity 
              style={styles.createButton}
              onPress={() => router.push('/(tabs)/create')}
            >
              <Plus size={18} color={colors.background} />
              <Text style={styles.createButtonText}>Create Oracle</Text>
            </TouchableOpacity>
          </View>
        ) : filteredOracles.length === 0 ? (
          <View style={styles.noResults}>
            <Search size={32} color={colors.textMuted} />
            <Text style={styles.noResultsText}>No oracles found</Text>
            <Text style={styles.noResultsHint}>
              {searchQuery ? 'Try a different search term' : 'No oracles in this category'}
            </Text>
          </View>
        ) : (
          <View style={styles.oraclesList}>
            {filteredOracles.map(oracle => (
              <OracleCard
                key={oracle.id}
                oracle={oracle}
                onPress={() => handleOraclePress(oracle.id)}
                onDelete={() => handleDeleteOracle(oracle.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {toast.visible && (
        <Animated.View 
          style={[
            styles.toast,
            {
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              }],
            },
          ]}
        >
          <Sparkles size={16} color={colors.background} />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </View>
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
    marginBottom: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  proBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFB800' + '15',
    borderWidth: 1,
    borderColor: '#FFB800' + '40',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  proText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: '#FFB800',
    letterSpacing: 1,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  categoriesScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
  },
  categoriesContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
  },
  categoryChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  categoryChipText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500' as const,
  },
  categoryChipTextActive: {
    color: colors.background,
  },
  countBadge: {
    backgroundColor: colors.surfaceBorder,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  countBadgeActive: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  countText: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600' as const,
  },
  countTextActive: {
    color: colors.background,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    backgroundColor: colors.accent + '15',
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  signInButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  signInButtonText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '600' as const,
  },
  emptyOracles: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyOraclesIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyOraclesTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: 8,
  },
  emptyOraclesText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    maxWidth: 280,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  createButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  noResultsText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 8,
  },
  noResultsHint: {
    fontSize: 13,
    color: colors.textMuted,
  },
  oraclesList: {
    gap: 0,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  refineInput: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalCancelText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  modalSubmitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  modalSubmitText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600' as const,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  toast: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: colors.accent,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  toastText: {
    fontSize: 14,
    color: colors.background,
    fontWeight: '600' as const,
  },
});
