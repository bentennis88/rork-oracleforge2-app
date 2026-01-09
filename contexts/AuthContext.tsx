import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User } from '@/types';

const AUTH_STORAGE_KEY = '@oracleforge_auth';
const ONBOARDING_STORAGE_KEY = '@oracleforge_onboarding_completed';

const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export const [AuthProvider, useAuth] = createContextHook(() => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    loadStoredUser();
    loadOnboardingStatus();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const parsedUser = JSON.parse(stored) as User;
        setUser(parsedUser);
      }
    } catch (error) {
      console.log('Error loading stored user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem(ONBOARDING_STORAGE_KEY);
      setHasCompletedOnboarding(completed === 'true');
    } catch (error) {
      console.log('Error loading onboarding status:', error);
    }
  };

  const signIn = useCallback(async (email: string, displayName: string) => {
    try {
      const newUser: User = {
        id: generateUserId(),
        email,
        displayName,
        photoURL: null,
        createdAt: Date.now(),
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      setUser(newUser);
      return { success: true };
    } catch (error) {
      console.log('Error signing in:', error);
      return { success: false, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setUser(null);
    } catch (error) {
      console.log('Error signing out:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!user) return;
    try {
      const updatedUser = { ...user, ...updates };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setUser(updatedUser);
    } catch (error) {
      console.log('Error updating profile:', error);
    }
  }, [user]);

  const completeOnboarding = useCallback(async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_STORAGE_KEY, 'true');
      setHasCompletedOnboarding(true);
    } catch (error) {
      console.log('Error saving onboarding status:', error);
    }
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    hasCompletedOnboarding,
    isPro,
    setIsPro,
    signIn,
    signOut,
    updateProfile,
    completeOnboarding,
  };
});
