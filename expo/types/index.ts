import type { OracleConfig } from '@/oracles/types';

export interface User {
  id: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: number;
}

export interface OracleLog {
  id: string;
  timestamp: number;
  date: string;
  type: string;
  value: number | string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type OracleCategory = 'tracker' | 'calculator' | 'list' | 'reminder' | 'finance' | 'health' | 'productivity' | 'other';

export interface Oracle {
  id: string;
  userId: string;
  name: string;
  description: string;
  prompt: string;
  /**
   * Legacy: previously used for AI-generated runtime code execution.
   * Kept optional for backward compatibility with stored data.
   */
  generatedCode?: string;
  /**
   * New: fixed, typed config rendered via /oracles/registry.ts (no eval).
   */
  config: OracleConfig;
  icon: string;
  color: string;
  category: OracleCategory;
  createdAt: number;
  updatedAt: number;
  isActive: boolean;
  data: Record<string, unknown>;
  logs: OracleLog[];
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
}

export interface OracleTemplate {
  id: string;
  name: string;
  description: string;
  prompt: string;
  icon: string;
}

export type CreateOracleInput = {
  prompt: string;
  name?: string;
};

export type AuthState = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
};
