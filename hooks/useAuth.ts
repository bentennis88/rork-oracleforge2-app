import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, AuthState } from '@/types';

const AUTH_STORAGE_KEY = '@oracleforge_auth';

const generateUserId = () => {
  return 'user_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    loadStoredUser();
  }, []);

  const loadStoredUser = async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const user = JSON.parse(stored) as User;
        setAuthState({
          user,
          isLoading: false,
          isAuthenticated: true,
        });
      } else {
        setAuthState({
          user: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    } catch (error) {
      console.log('Error loading stored user:', error);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  };

  const signIn = useCallback(async (email: string, displayName: string) => {
    try {
      const user: User = {
        id: generateUserId(),
        email,
        displayName,
        photoURL: null,
        createdAt: Date.now(),
      };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      setAuthState({
        user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true };
    } catch (error) {
      console.log('Error signing in:', error);
      return { success: false, error };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      console.log('Error signing out:', error);
    }
  }, []);

  const updateProfile = useCallback(async (updates: Partial<User>) => {
    if (!authState.user) return;
    try {
      const updatedUser = { ...authState.user, ...updates };
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedUser));
      setAuthState(prev => ({
        ...prev,
        user: updatedUser,
      }));
    } catch (error) {
      console.log('Error updating profile:', error);
    }
  }, [authState.user]);

  return {
    ...authState,
    signIn,
    signOut,
    updateProfile,
  };
}
