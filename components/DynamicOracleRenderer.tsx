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
} from 'react-native';
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

const screenWidth = Dimensions.get('window').width;

const chartConfig = {
  backgroundColor: '#000',
  backgroundGradientFrom: '#0A0A0A',
  backgroundGradientTo: '#0A0A0A',
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(10, 255, 230, ${opacity})`,
  labelColor: () => '#888',
  style: { borderRadius: 0 },
  propsForBackgroundLines: { strokeDasharray: '', stroke: '#1F1F1F' },
};

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
  data: Record<string, unknown>;
  logs?: OracleLog[];
  onDataChange?: (data: Record<string, unknown>) => void;
  onAddLog?: (log: { type: string; value: number | string | Record<string, unknown>; metadata?: Record<string, unknown> }) => void;
  config?: OracleConfig;
}

const transpileJSX = (code: string): string => {
  try {
    console.log('[Babel] Starting transpilation...');
    const result = Babel.transform(code, {
      presets: ['react', 'env'] as string[],
      filename: 'oracle-component.jsx',
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

const hasOracleComponent = (code: string): boolean => {
  return /function\s+OracleComponent\s*\(/.test(code) || 
         /const\s+OracleComponent\s*=/.test(code) ||
         /let\s+OracleComponent\s*=/.test(code) ||
         /var\s+OracleComponent\s*=/.test(code);
};

const normalizeOracleCode = (code: string): string => {
  let normalized = code;
  
  normalized = normalized.replace(/^\s*import\s+.*?[;\n]/gm, '');
  normalized = normalized.replace(/^\s*export\s+(default\s+)?/gm, '');
  
  if (!hasOracleComponent(normalized)) {
    const arrowMatch = normalized.match(/const\s+(\w+)\s*=\s*\(\s*\{\s*data/);
    if (arrowMatch) {
      normalized = normalized.replace(
        new RegExp(`const\\s+${arrowMatch[1]}\\s*=`),
        'const OracleComponent ='
      );
    }
    
    const funcMatch = normalized.match(/function\s+(\w+)\s*\(\s*\{\s*data/);
    if (funcMatch && funcMatch[1] !== 'OracleComponent') {
      normalized = normalized.replace(
        new RegExp(`function\\s+${funcMatch[1]}\\s*\\(`),
        'function OracleComponent('
      );
    }
  }
  
  return normalized;
};

const createOracleComponent = (code: string) => {
  try {
    console.log('[CodeBasedOracle] Creating component, code length:', code.length);
    
    if (!code || code.length < 50) {
      console.log('[CodeBasedOracle] Code too short, skipping');
      return null;
    }
    
    let cleanCode = normalizeOracleCode(code);
    
    if (!hasOracleComponent(cleanCode)) {
      console.error('[CodeBasedOracle] No OracleComponent found after normalization');
      console.log('[CodeBasedOracle] Code preview:', cleanCode.substring(0, 300));
      throw new Error('No valid component function found. Ensure code defines OracleComponent.');
    }
    
    console.log('[CodeBasedOracle] Transpiling JSX with Babel...');
    const transpiledCode = transpileJSX(cleanCode);
    
    console.log('[CodeBasedOracle] Transpiled code preview:', transpiledCode.substring(0, 200));

    const wrappedCode = `
      (function() {
        'use strict';
        try {
          ${transpiledCode}
          if (typeof OracleComponent !== 'undefined') {
            console.log('[Eval] OracleComponent found');
            return OracleComponent;
          }
          console.error('[Eval] OracleComponent not defined');
          return null;
        } catch (evalError) {
          console.error('[Eval] Execution error:', evalError);
          throw evalError;
        }
      })()`;

    console.log('[CodeBasedOracle] Creating safe execution context...');
    const ComponentCreator = new Function(
      'React',
      'useState',
      'useEffect',
      'useCallback',
      'useMemo',
      'useRef',
      'View',
      'Text',
      'StyleSheet',
      'TouchableOpacity',
      'TextInput',
      'ScrollView',
      'FlatList',
      'Switch',
      'Modal',
      'Animated',
      'Alert',
      'Share',
      'Platform',
      'Dimensions',
      'Check', 'Plus', 'Minus', 'Trash2', 'RefreshCw', 'Share2', 'Droplet', 'Flame',
      'TrendingUp', 'TrendingDown', 'Clock', 'Zap', 'Heart', 'Star', 'Calendar', 'Target',
      'Award', 'Bell', 'Activity', 'ShoppingCart', 'DollarSign', 'BarChart3', 'Coffee', 'Moon', 'Sun',
      'Edit2', 'Save', 'X', 'ChevronRight', 'ChevronDown', 'Search', 'Filter', 'Settings',
      'User', 'Home', 'MapPin', 'Phone', 'Mail', 'Camera', 'Image', 'Play', 'Pause',
      'Square', 'Circle', 'Triangle', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'RotateCcw', 'Volume2', 'VolumeX', 'Wifi', 'Battery', 'Bluetooth', 'Lock', 'Unlock',
      'Eye', 'EyeOff', 'Copy', 'Clipboard', 'Download', 'Upload', 'Link', 'ExternalLink',
      'Bookmark', 'Tag', 'Hash', 'AtSign', 'MessageCircle', 'Send', 'Paperclip', 'File',
      'Folder', 'Archive', 'Package', 'Gift', 'CreditCard', 'Wallet', 'PiggyBank', 'Receipt',
      'Calculator', 'Percent', 'Timer', 'Alarm', 'Stopwatch', 'Watch', 'Sunrise', 'Sunset',
      'Cloud', 'CloudRain', 'Snowflake', 'Wind', 'Thermometer', 'Umbrella', 'Briefcase',
      'Building', 'Store', 'Truck', 'Car', 'Bike', 'Plane', 'Train', 'Ship', 'Anchor',
      'Flag', 'Map', 'Compass', 'Navigation', 'Globe', 'Mountain', 'Trees', 'Flower', 'Leaf',
      'Apple', 'Pizza', 'Utensils', 'Wine', 'Beer', 'Cake', 'IceCream', 'Pill', 'Stethoscope',
      'Syringe', 'Bandage', 'Dumbbell', 'Trophy', 'Medal', 'Crown', 'Gem', 'Sparkles', 'Wand2',
      'Lightbulb', 'Rocket', 'Puzzle', 'Gamepad', 'Dice', 'Music', 'Headphones', 'Mic', 'Video',
      'Tv', 'Monitor', 'Smartphone', 'Tablet', 'Laptop', 'Keyboard', 'Mouse', 'Printer',
      'Server', 'Database', 'HardDrive', 'Cpu', 'Code', 'Terminal', 'Bug', 'Shield', 'Key',
      'Fingerprint', 'Scan', 'QrCode', 'AlertCircle', 'Info', 'HelpCircle',
      'ListTodo', 'ListChecks', 'Grid', 'Layers', 'Layout', 'Box', 'Hexagon', 'Maximize', 'Minimize',
      'MoreHorizontal', 'MoreVertical', 'Menu', 'SlidersHorizontal', 'ToggleLeft', 'ToggleRight',
      'BarChart', 'LineChart', 'PieChart',
      'screenWidth',
      'colors',
      'chartConfig',
      `return ${wrappedCode}`
    );

    const useRef = React.useRef;
    const Dice = Dice5;

    const component = ComponentCreator(
      React,
      useState,
      useEffect,
      useCallback,
      useMemo,
      useRef,
      View,
      Text,
      StyleSheet,
      TouchableOpacity,
      TextInput,
      ScrollView,
      FlatList,
      Switch,
      Modal,
      Animated,
      Alert,
      Share,
      Platform,
      Dimensions,
      Check, Plus, Minus, Trash2, RefreshCw, Share2, Droplet, Flame,
      TrendingUp, TrendingDown, Clock, Zap, Heart, Star, Calendar, Target,
      Award, Bell, Activity, ShoppingCart, DollarSign, BarChart3, Coffee, Moon, Sun,
      Edit2, Save, X, ChevronRight, ChevronDown, Search, Filter, Settings,
      User, Home, MapPin, Phone, Mail, Camera, Image, Play, Pause,
      Square, Circle, Triangle, ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
      RotateCcw, Volume2, VolumeX, Wifi, Battery, Bluetooth, Lock, Unlock,
      Eye, EyeOff, Copy, Clipboard, Download, Upload, Link, ExternalLink,
      Bookmark, Tag, Hash, AtSign, MessageCircle, Send, Paperclip, File,
      Folder, Archive, Package, Gift, CreditCard, Wallet, PiggyBank, Receipt,
      Calculator, Percent, Timer, Album, Hourglass, Watch, Sunrise, Sunset,
      Cloud, CloudRain, Snowflake, Wind, Thermometer, Umbrella, Briefcase,
      Building, Store, Truck, Car, Bike, Plane, Train, Ship, Anchor,
      Flag, Map, Compass, Navigation, Globe, Mountain, Trees, Flower, Leaf,
      Apple, Pizza, Utensils, Wine, Beer, Cake, IceCream, Pill, Stethoscope,
      Syringe, Bandage, Dumbbell, Trophy, Medal, Crown, Gem, Sparkles, Wand2,
      Lightbulb, Rocket, Puzzle, Gamepad, Dice, Music, Headphones, Mic, Video,
      Tv, Monitor, Smartphone, Tablet, Laptop, Keyboard, Mouse, Printer,
      Server, Database, HardDrive, Cpu, Code, Terminal, Bug, Shield, Key,
      Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
      ListTodo, ListChecks, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
      MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
      BarChart, LineChart, PieChart,
      screenWidth,
      colors,
      chartConfig
    );

    if (!component) {
      console.log('[CodeBasedOracle] Component returned null');
      return null;
    }
    
    if (typeof component !== 'function') {
      console.log('[CodeBasedOracle] Expected function, got', typeof component);
      return null;
    }

    console.log('[CodeBasedOracle] ✅ Component created successfully');
    return component;
  } catch (error) {
    console.error('[CodeBasedOracle] ❌ Error creating component:', error);
    
    const errorMsg = error instanceof Error ? error.message : String(error);
    const errorName = error instanceof Error ? error.name : '';
    
    // Handle various error types gracefully
    if (errorMsg.includes('sandbox') || 
        errorMsg.includes('timeout') || 
        errorMsg.includes('TimeoutError') || 
        errorMsg.includes('not found') ||
        errorName === 'TimeoutError') {
      // These are likely stale errors from previous implementations - just return null to use fallback
      console.log('[CodeBasedOracle] Ignoring external service error, using fallback');
      return null;
    } else if (error instanceof SyntaxError) {
      throw new Error(`Syntax Error: ${error.message}`);
    } else if (error instanceof ReferenceError) {
      throw new Error(`Reference Error: ${error.message}. Check variable names.`);
    } else if (error instanceof TypeError) {
      throw new Error(`Type Error: ${error.message}`);
    }
    
    throw new Error(errorMsg || 'Failed to create component');
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
  data, 
  logs = [], 
  onDataChange, 
  onAddLog, 
  config 
}: DynamicOracleRendererProps) {
  const [error, setError] = useState<string | null>(null);
  const [GeneratedComponent, setGeneratedComponent] = useState<React.ComponentType<{
    data: Record<string, unknown>;
    onDataChange?: (data: Record<string, unknown>) => void;
    onAddLog?: (log: { type: string; value: number | string | Record<string, unknown>; metadata?: Record<string, unknown> }) => void;
    logs: OracleLog[];
    accent: string;
  }> | null>(null);
  
  const accent = config?.accentColor || '#0AFFE6';

  useEffect(() => {
    if (!code || code.length < 50) {
      console.log('[DynamicRenderer] No valid code provided, using fallback');
      setGeneratedComponent(null);
      setError(null);
      return;
    }
    
    const hasValidComponent = hasOracleComponent(code) || 
      /const\s+\w+\s*=\s*\(\s*\{\s*data/.test(code) ||
      /function\s+\w+\s*\(\s*\{\s*data/.test(code);
    
    if (!hasValidComponent) {
      console.log('[DynamicRenderer] Code does not contain a valid component structure');
      setGeneratedComponent(null);
      setError(null);
      return;
    }

    console.log('[DynamicRenderer] Attempting to create component from code');
    
    // Use requestAnimationFrame to avoid blocking the UI
    const timeoutId = setTimeout(() => {
      try {
        const component = createOracleComponent(code);
        if (component) {
          setGeneratedComponent(() => component);
          setError(null);
          console.log('[DynamicRenderer] Component created successfully');
        } else {
          // Component creation returned null - use fallback without error
          console.log('[DynamicRenderer] Using fallback component');
          setGeneratedComponent(null);
          setError(null);
        }
      } catch (err) {
        console.error('[DynamicRenderer] Failed to create component:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        const errorName = err instanceof Error ? err.name : '';
        
        // Check for sandbox/timeout errors and use fallback instead of showing error
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
        }
      }
    }, 0);
    
    return () => clearTimeout(timeoutId);
  }, [code]);

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
          data={data} 
          onDataChange={onDataChange} 
          onAddLog={onAddLog} 
          logs={logs}
          accent={accent}
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
