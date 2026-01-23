import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
} from 'react-native';
import { User, LogOut, Mail, Shield, ChevronRight, Crown, Zap, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useOracles } from '@/contexts/OraclesContext';

const FREE_ORACLE_LIMIT = 2;

export default function ProfileScreen() {
  const { user, isAuthenticated, signIn, signOut, isPro } = useAuth();
  const { oracles } = useOracles();
  const oraclesRemaining = FREE_ORACLE_LIMIT - oracles.length;
  const isAtLimit = oracles.length >= FREE_ORACLE_LIMIT && !isPro;
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !displayName.trim()) {
      Alert.alert('Missing Info', 'Please enter your email and name');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsSigningIn(true);

    try {
      await signIn(email.trim(), displayName.trim());
    } catch (error) {
      console.log('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            signOut();
          }
        },
      ]
    );
  };

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.authContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authHeader}>
            <View style={styles.authIcon}>
              <User size={32} color={colors.accent} strokeWidth={1} />
            </View>
            <Text style={styles.authTitle}>Join OracleForge</Text>
            <Text style={styles.authSubtitle}>
              Create an account to build and save your oracles
            </Text>
          </View>

          <View style={styles.authForm}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <TextInput
                style={styles.input}
                placeholder="your@email.com"
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                testID="email-input"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>DISPLAY NAME</Text>
              <TextInput
                style={styles.input}
                placeholder="How should we call you?"
                placeholderTextColor={colors.textMuted}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                testID="name-input"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.signInButton,
                isSigningIn && styles.signInButtonDisabled,
              ]}
              onPress={handleSignIn}
              disabled={isSigningIn}
              testID="sign-in-button"
            >
              <Text style={styles.signInButtonText}>
                {isSigningIn ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.authFooter}>
            <Shield size={14} color={colors.textMuted} />
            <Text style={styles.authFooterText}>
              Your data is private and stored locally
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.displayName?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.profileName}>{user?.displayName}</Text>
          <Text style={styles.profileEmail}>{user?.email}</Text>
        </View>

        <View style={styles.tierBadge}>
          <View style={[styles.tierIcon, isPro && styles.tierIconPro]}>
            {isPro ? <Crown size={14} color="#FFB800" /> : <Zap size={14} color={colors.accent} />}
          </View>
          <Text style={[styles.tierText, isPro && styles.tierTextPro]}>
            {isPro ? 'Pro' : 'Free'}
          </Text>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{oracles.length}</Text>
            <Text style={styles.statLabel}>Oracles</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {isPro ? '∞' : oraclesRemaining > 0 ? oraclesRemaining : 0}
            </Text>
            <Text style={styles.statLabel}>{isPro ? 'Unlimited' : 'Remaining'}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {oracles.length}
            </Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>

        {!isPro && (
          <View style={styles.upgradeSection}>
            <View style={styles.upgradeHeader}>
              <Crown size={20} color="#FFB800" />
              <Text style={styles.upgradeTitle}>Upgrade to Pro</Text>
            </View>
            <Text style={styles.upgradeDescription}>
              Unlock unlimited oracles and premium features
            </Text>
            
            <View style={styles.upgradeFeatures}>
              <View style={styles.upgradeFeature}>
                <Zap size={14} color={colors.accent} />
                <Text style={styles.upgradeFeatureText}>Unlimited oracle creation</Text>
              </View>
              <View style={styles.upgradeFeature}>
                <Shield size={14} color={colors.accent} />
                <Text style={styles.upgradeFeatureText}>Priority AI generation</Text>
              </View>
            </View>

            <TouchableOpacity 
              style={styles.upgradeButton}
              onPress={() => Alert.alert('Coming Soon', 'Pro subscription will be available soon!')}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade — $4.99/month</Text>
            </TouchableOpacity>

            {isAtLimit && (
              <View style={styles.limitWarning}>
                <Lock size={14} color={colors.warning} />
                <Text style={styles.limitWarningText}>
                  You&apos;ve reached the free limit of {FREE_ORACLE_LIMIT} oracles
                </Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          
          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <Mail size={18} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>{user?.email}</Text>
            </View>
          </View>

          <View style={styles.menuItem}>
            <View style={styles.menuItemLeft}>
              <User size={18} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>{user?.displayName}</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>SETTINGS</Text>
          
          <TouchableOpacity
            style={styles.menuItem}
            activeOpacity={0.8}
            onPress={() => {
              Alert.alert(
                'BitForgeLegacy LLC — Privacy & Data',
                'BitForgeLegacy LLC (OracleForge) respects your privacy.\n\n- Data Usage: Generated oracles and user-provided prompts are processed to produce app content. We do not share your prompts or generated oracles with third parties except where required to provide AI services.\n\n- Storage: Your oracles are saved to your account (if signed in) and stored securely in Firebase. Local copies are kept on your device.\n\n- Security: We use industry-standard protections for stored data. Do not share sensitive personal information in prompts.\n\n- Opt-out & Deletion: You can delete individual oracles from your profile. To fully delete your account and associated data, contact support at privacy@bitforgelegacy.com.',
                [ { text: 'OK', style: 'default' } ],
                { cancelable: true }
              );
            }}
          >
            <View style={styles.menuItemLeft}>
              <Shield size={18} color={colors.textSecondary} />
              <Text style={styles.menuItemText}>Privacy & Data</Text>
            </View>
            <ChevronRight size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.signOutButton}
          onPress={handleSignOut}
          testID="sign-out-button"
        >
          <LogOut size={18} color={colors.error} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>OracleForge v1.0.0</Text>
      </ScrollView>
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
  authContent: {
    padding: 20,
    paddingTop: 40,
  },
  authHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  authIcon: {
    width: 72,
    height: 72,
    borderWidth: 1,
    borderColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  authTitle: {
    fontSize: 26,
    fontWeight: '300' as const,
    color: colors.text,
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  authForm: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    padding: 14,
    fontSize: 15,
    color: colors.text,
  },
  signInButton: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  signInButtonDisabled: {
    opacity: 0.5,
  },
  signInButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 1,
  },
  authFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  authFooterText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 32,
    paddingTop: 20,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    backgroundColor: colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600' as const,
    color: colors.background,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '500' as const,
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 20,
    marginBottom: 32,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '300' as const,
    color: colors.accent,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statDivider: {
    width: 1,
    backgroundColor: colors.surfaceBorder,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent + '40',
    marginBottom: 24,
  },
  tierIcon: {
    opacity: 0.9,
  },
  tierIconPro: {
    opacity: 1,
  },
  tierText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: colors.accent,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  tierTextPro: {
    color: '#FFB800',
  },
  upgradeSection: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#FFB800' + '30',
    padding: 20,
    marginBottom: 24,
  },
  upgradeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.text,
  },
  upgradeDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  upgradeFeatures: {
    gap: 10,
    marginBottom: 20,
  },
  upgradeFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  upgradeFeatureText: {
    fontSize: 13,
    color: colors.text,
  },
  upgradeButton: {
    backgroundColor: '#FFB800',
    paddingVertical: 14,
    alignItems: 'center',
  },
  upgradeButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600' as const,
    letterSpacing: 0.5,
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.surfaceBorder,
  },
  limitWarningText: {
    fontSize: 12,
    color: colors.warning,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textMuted,
    letterSpacing: 2,
    marginBottom: 12,
  },
  menuItem: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 14,
    color: colors.text,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: colors.error + '40',
    marginTop: 16,
  },
  signOutText: {
    fontSize: 14,
    color: colors.error,
    fontWeight: '500' as const,
  },
  version: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 32,
  },
});
