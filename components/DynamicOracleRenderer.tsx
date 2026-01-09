import React, { useState, useEffect, useMemo, useCallback } from 'react';
import * as Babel from '@babel/standalone';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Share,
  Dimensions,
  FlatList,
  Switch,
  Modal,
  Animated,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { 
  Check, Plus, Minus, Trash2, RefreshCw, Share2, ShoppingCart, Droplet, Flame, 
  TrendingUp, TrendingDown, Clock, Zap, Heart, Star, Calendar, Target, Award, 
  Bell, Activity, DollarSign, BarChart3, Coffee, Moon, Sun, Edit2, Save, X,
  ChevronRight, ChevronDown, Search, Filter, Settings, User, Home, MapPin,
  Phone, Mail, Camera, Image, Play, Pause, Square, Circle, Triangle,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Volume2, VolumeX,
  Wifi, Battery, Bluetooth, Lock, Unlock, Eye, EyeOff, Copy, Clipboard,
  Download, Upload, Link, ExternalLink, Bookmark, Tag, Hash, AtSign,
  MessageCircle, Send, Paperclip, File, Folder, Archive, Package, Gift,
  CreditCard, Wallet, PiggyBank, Receipt, Calculator, Percent, Timer,
  Album, Hourglass, Watch, Sunrise, Sunset, Cloud, CloudRain, Snowflake,
  Wind, Thermometer, Umbrella, Briefcase, Building, Store, Truck, Car,
  Bike, Plane, Train, Ship, Anchor, Flag, Map, Compass, Navigation, Globe,
  Mountain, Trees, Flower, Leaf, Apple, Pizza, Utensils, Wine, Beer, Cake,
  IceCream, Pill, Stethoscope, Syringe, Bandage, Dumbbell, Trophy, Medal,
  Crown, Gem, Sparkles, Wand2, Lightbulb, Rocket, Puzzle, Gamepad, Dice5,
  Music, Headphones, Mic, Video, Tv, Monitor, Smartphone, Tablet, Laptop,
  Keyboard, Mouse, Printer, Server, Database, HardDrive, Cpu, Code, Terminal,
  Bug, Shield, Key, Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
  ListTodo, ListChecks, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
  MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
} from 'lucide-react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import colors from '@/constants/colors';
import firebaseService from '@/services/firebaseService';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});



interface OracleLog {
  id: string;
  timestamp: number;
  date: string;
  type: string;
  value: number | string | Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

interface OracleConfig {
  name: string;
  description: string;
  code?: string;
  oracleType?: string;
  features?: string[];
  accentColor?: string;
  icon?: string;
  initialData?: Record<string, unknown>;
}

interface DynamicOracleRendererProps {
  code: string;
  userId: string;
  oracleId: string;
  data: Record<string, unknown>;
  logs?: OracleLog[];
  onDataChange?: (data: Record<string, unknown>) => void;
  onAddLog?: (log: { type: string; value: number | string | Record<string, unknown>; metadata?: Record<string, unknown> }) => void;
  config?: OracleConfig;
  onError?: (error: Error) => void;
}

const transpileCode = (code: string): string => {
  try {
    console.log('[Babel] Starting transpilation...');
    const result = Babel.transform(code, {
      presets: ['react', 'typescript'],
      plugins: [
        'transform-modules-commonjs',
        'proposal-class-properties',
        'proposal-object-rest-spread',
      ],
      filename: 'OracleComponent.tsx',
      sourceType: 'module',
    });
    
    if (!result.code) {
      throw new Error('Babel returned empty code');
    }
    
    console.log('[Babel] Transpilation successful, code length:', result.code.length);
    return result.code;
  } catch (error) {
    console.error('[Babel] Transpilation error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    
    if (errorMsg.includes('Unexpected token')) {
      throw new Error('Invalid JSX syntax. Check for unclosed tags or brackets.');
    } else if (errorMsg.includes('reserved word')) {
      throw new Error('Code contains reserved JavaScript keywords in invalid positions.');
    } else {
      throw new Error(`Transpilation failed: ${errorMsg}`);
    }
  }
};

const createExecutionContext = () => {
  return {
    React,
    useState: React.useState,
    useEffect: React.useEffect,
    useCallback: React.useCallback,
    useMemo: React.useMemo,
    useRef: React.useRef,
    
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    Platform,
    Share,
    Dimensions,
    FlatList,
    Switch,
    Modal,
    Animated,
    ActivityIndicator,
    
    AsyncStorage,
    Notifications,
    
    BarChart,
    PieChart,
    LineChart,
    
    Check, Plus, Minus, Trash2, RefreshCw, Share2, ShoppingCart, Droplet, Flame,
    TrendingUp, TrendingDown, Clock, Zap, Heart, Star, Calendar, Target, Award,
    Bell, Activity, DollarSign, BarChart3, Coffee, Moon, Sun, Edit2, Save, X,
    ChevronRight, ChevronDown, Search, Filter, Settings, User, Home, MapPin,
    Phone, Mail, Camera, Image, Play, Pause, Square, Circle, Triangle,
    ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Volume2, VolumeX,
    Wifi, Battery, Bluetooth, Lock, Unlock, Eye, EyeOff, Copy, Clipboard,
    Download, Upload, Link, ExternalLink, Bookmark, Tag, Hash, AtSign,
    MessageCircle, Send, Paperclip, File, Folder, Archive, Package, Gift,
    CreditCard, Wallet, PiggyBank, Receipt, Calculator, Percent, Timer,
    Album, Hourglass, Watch, Sunrise, Sunset, Cloud, CloudRain, Snowflake,
    Wind, Thermometer, Umbrella, Briefcase, Building, Store, Truck, Car,
    Bike, Plane, Train, Ship, Anchor, Flag, Map, Compass, Navigation, Globe,
    Mountain, Trees, Flower, Leaf, Apple, Pizza, Utensils, Wine, Beer, Cake,
    IceCream, Pill, Stethoscope, Syringe, Bandage, Dumbbell, Trophy, Medal,
    Crown, Gem, Sparkles, Wand2, Lightbulb, Rocket, Puzzle, Gamepad,
    Dice: Dice5,
    Music, Headphones, Mic, Video, Tv, Monitor, Smartphone, Tablet, Laptop,
    Keyboard, Mouse, Printer, Server, Database, HardDrive, Cpu, Code, Terminal,
    Bug, Shield, Key, Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
    ListTodo, ListChecks, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
    MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
    
    firebaseService,
    
    console,
    alert: Alert.alert,
    Math,
    Date,
    JSON,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
  };
};

const createOracleComponent = (code: string) => {
  try {
    console.log('[DynamicOracle] Creating component, code length:', code.length);
    
    if (!code || code.length < 50) {
      console.log('[DynamicOracle] Code too short, skipping');
      return null;
    }
    
    if (!code.includes('import') && !code.includes('export')) {
      throw new Error('Invalid component: missing imports or export statement');
    }
    
    console.log('[DynamicOracle] Transpiling code with Babel...');
    const transpiled = transpileCode(code);
    
    if (!transpiled) {
      throw new Error('Transpilation failed: empty output');
    }
    
    console.log('[DynamicOracle] Transpiled code preview:', transpiled.substring(0, 200));
    
    const context = createExecutionContext();
    const module = { exports: {} };
    const require = (name: string) => {
      if (name === 'react') return React;
      if (name === 'react-native') return {
        View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
        Alert, Platform, Share, Dimensions, FlatList, Switch, Modal,
        Animated, ActivityIndicator
      };
      if (name === '@react-native-async-storage/async-storage') return AsyncStorage;
      if (name === 'expo-notifications') return Notifications;
      if (name === 'react-native-chart-kit') return { BarChart, PieChart, LineChart };
      if (name === 'lucide-react-native') return context;
      throw new Error(`Module not found: ${name}`);
    };
    
    const executor = new Function(
      'module',
      'exports',
      'require',
      ...Object.keys(context),
      `
      ${transpiled}
      return module.exports.default || module.exports;
      `
    );
    
    console.log('[DynamicOracle] Executing component code...');
    const LoadedComponent = executor(
      module,
      module.exports,
      require,
      ...Object.values(context)
    );
    
    if (!LoadedComponent) {
      throw new Error('No component exported from code');
    }
    
    if (typeof LoadedComponent !== 'function') {
      throw new Error('Exported value is not a valid React component');
    }
    
    console.log('[DynamicOracle] ✅ Component created successfully');
    return LoadedComponent;
  } catch (error) {
    console.error('[DynamicOracle] ❌ Error creating component:', error);
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';
    
    if (errorMsg.includes('sandbox') || 
        errorMsg.includes('timeout') || 
        errorMsg.includes('TimeoutError') || 
        errorMsg.includes('not found') ||
        errorName === 'TimeoutError') {
      console.log('[DynamicOracle] Ignoring external service error, using fallback');
      return null;
    } else if (error instanceof SyntaxError) {
      throw new Error(`Syntax Error: ${error.message}`);
    } else if (error instanceof ReferenceError) {
      throw new Error(`Reference Error: ${error.message}. Check variable names.`);
    } else if (error instanceof TypeError) {
      throw new Error(`Type Error: ${error.message}`);
    }
    
    throw error;
  }
};

const ErrorDisplay: React.FC<{ error: string; onRetry?: () => void }> = ({ error }) => {
  const isImportError = error.includes('import') || error.includes('module');
  const isSyntaxError = error.includes('Syntax') || error.includes('Unexpected') || error.includes('invalid');
  const isComponentError = error.includes('OracleComponent');
  const isTimeoutError = error.includes('timeout') || error.includes('sandbox') || error.includes('TimeoutError');
  
  let title = 'Generation Error';
  let hint = 'Try refining your oracle with clearer instructions.';
  
  if (isTimeoutError) {
    title = 'Preview Timeout';
    hint = 'The preview took too long to load. Try refreshing or simplifying your oracle.';
  } else if (isImportError) {
    title = 'Code Structure Error';
    hint = 'The AI generated invalid code. Try rephrasing your request.';
  } else if (isSyntaxError) {
    title = 'Syntax Error';
    hint = 'There\'s a syntax issue. Try simplifying your request or starting fresh.';
  } else if (isComponentError) {
    title = 'Component Error';
    hint = 'The component couldn\'t be created. Try a different approach.';
  }
  
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIconContainer}>
        <Bug size={32} color={colors.error} />
      </View>
      <Text style={styles.errorTitle}>{title}</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <Text style={styles.errorHint}>{hint}</Text>
    </View>
  );
};

const FallbackOracle: React.FC<{
  data: Record<string, unknown>;
  onDataChange?: (data: Record<string, unknown>) => void;
  accent: string;
}> = ({ data, onDataChange, accent }) => {
  const items = useMemo(() => (data.items as { id: string; text: string; done: boolean }[]) || [], [data.items]);
  const [newItem, setNewItem] = useState('');
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    return items.filter(item => 
      item.text.toLowerCase().includes(search.toLowerCase())
    );
  }, [items, search]);

  const addItem = useCallback(() => {
    if (!newItem.trim()) return;
    const item = { id: Date.now().toString(), text: newItem.trim(), done: false };
    onDataChange?.({ items: [...items, item] });
    setNewItem('');
  }, [newItem, items, onDataChange]);

  const toggleItem = useCallback((id: string) => {
    const updated = items.map(i => i.id === id ? { ...i, done: !i.done } : i);
    onDataChange?.({ items: updated });
  }, [items, onDataChange]);

  const deleteItem = useCallback((id: string) => {
    onDataChange?.({ items: items.filter(i => i.id !== id) });
  }, [items, onDataChange]);

  const completedCount = items.filter(i => i.done).length;

  return (
    <ScrollView style={styles.fallbackContainer} nestedScrollEnabled>
      <View style={styles.fallbackHeader}>
        <Text style={styles.fallbackTitle}>Quick List</Text>
        <Text style={styles.fallbackSubtitle}>{completedCount}/{items.length} done</Text>
      </View>

      <View style={styles.searchRow}>
        <Search size={16} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Add item..."
          placeholderTextColor={colors.textMuted}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addItem}
        />
        <TouchableOpacity style={[styles.addButton, { backgroundColor: accent }]} onPress={addItem}>
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      {filteredItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            {search ? 'No matching items' : 'No items yet'}
          </Text>
        </View>
      ) : (
        filteredItems.map(item => (
          <View key={item.id} style={styles.listItem}>
            <TouchableOpacity
              style={[styles.checkbox, item.done && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => toggleItem(item.id)}
            >
              {item.done && <Check size={14} color={colors.background} />}
            </TouchableOpacity>
            <Text style={[styles.listItemText, item.done && styles.listItemTextDone]}>
              {item.text}
            </Text>
            <TouchableOpacity onPress={() => deleteItem(item.id)} style={styles.deleteButton}>
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
};

export default function DynamicOracleRenderer({ 
  code,
  userId,
  oracleId,
  data, 
  logs = [], 
  onDataChange, 
  onAddLog, 
  config,
  onError
}: DynamicOracleRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [GeneratedComponent, setGeneratedComponent] = useState<React.ComponentType<any> | null>(null);
  
  const accent = config?.accentColor || '#0AFFE6';

  useEffect(() => {
    if (!code || code.length < 50) {
      console.log('[DynamicRenderer] No valid code provided, using fallback');
      setGeneratedComponent(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    console.log('[DynamicRenderer] Attempting to create component from code');
    setIsLoading(true);
    
    const timeoutId = setTimeout(() => {
      try {
        const component = createOracleComponent(code);
        if (component) {
          setGeneratedComponent(() => component);
          setError(null);
          console.log('[DynamicRenderer] Component created successfully');
        } else {
          console.log('[DynamicRenderer] Using fallback component');
          setGeneratedComponent(null);
          setError(null);
        }
        setIsLoading(false);
      } catch (err: any) {
        console.error('[DynamicRenderer] Failed to create component:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorName = err instanceof Error ? err.name : '';
        
        if (errorMessage.includes('sandbox') || 
            errorMessage.includes('timeout') || 
            errorMessage.includes('TimeoutError') || 
            errorMessage.includes('not found') ||
            errorName === 'TimeoutError') {
          console.log('[DynamicRenderer] Ignoring external error, using fallback');
          setGeneratedComponent(null);
          setError(null);
        } else {
          setError(errorMessage);
          setGeneratedComponent(null);
          onError?.(err);
        }
        setIsLoading(false);
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [code, onError]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={accent} />
        <Text style={styles.loadingText}>Loading oracle...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <ErrorDisplay error={error} />
      </View>
    );
  }

  if (GeneratedComponent) {
    return (
      <View style={styles.container}>
        <GeneratedComponent 
          userId={userId}
          oracleId={oracleId}
          firebaseService={firebaseService}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FallbackOracle 
        data={data} 
        onDataChange={onDataChange} 
        accent={accent} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    overflow: 'hidden',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    minHeight: 300,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textMuted,
  },
  errorContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 300,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: colors.error,
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  errorHint: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic' as const,
    paddingHorizontal: 24,
  },
  fallbackContainer: {
    flex: 1,
    padding: 20,
  },
  fallbackHeader: {
    marginBottom: 20,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: '600' as const,
    color: colors.text,
  },
  fallbackSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 4,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 14,
    color: colors.text,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.text,
  },
  addButton: {
    width: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.surfaceBorder,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listItemText: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
  },
  listItemTextDone: {
    textDecorationLine: 'line-through',
    color: colors.textMuted,
  },
  deleteButton: {
    padding: 8,
  },
});
