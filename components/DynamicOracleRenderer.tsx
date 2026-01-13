import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
import { refineOracleCode } from '@/services/grokApi';

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

const stripMarkdownCodeFences = (input: string): string => {
  const s = (input || '').trim();

  const fenceRe = /```[ \t]*([a-zA-Z0-9_-]+)?[ \t]*\r?\n([\s\S]*?)\r?\n?```/g;
  const matches = Array.from(s.matchAll(fenceRe));
  if (matches.length > 0) {
    const best = matches.reduce((acc, cur) => {
      const curBody = cur[2] ?? '';
      const accBody = acc[2] ?? '';
      return curBody.length > accBody.length ? cur : acc;
    });
    return (best[2] ?? '').trim();
  }

  if (s.startsWith('```')) {
    const firstNewline = s.indexOf('\n');
    const withoutFirstLine = firstNewline >= 0 ? s.slice(firstNewline + 1) : '';
    return withoutFirstLine.replace(/\r?\n?```[ \t]*$/m, '').trim();
  }

  return s;
};

const maybeAugmentMissingFeatures = (input: string, promptText: string): string => {
  const code = (input || '').trim();
  const prompt = (promptText || '').toLowerCase();

  // Avoid double-injection.
  if (code.includes('ORACLEFORGE_AUTO_FEATURES')) return code;

  const wantsReminders =
    prompt.includes('reminder') || prompt.includes('notify') || prompt.includes('notification') || prompt.includes('alert');
  const wantsTracking =
    prompt.includes('track') || prompt.includes('tracker') || prompt.includes('logging') || prompt.includes('log ') || prompt.includes('streak');
  const wantsChart = prompt.includes('chart') || prompt.includes('graph') || prompt.includes('visual');

  if (!wantsReminders && !wantsTracking && !wantsChart) return code;

  const hasNotifications = code.includes("from 'expo-notifications'") || code.includes('expo-notifications') || code.includes('Notifications.');
  const hasChartKit = code.includes('react-native-chart-kit') || code.includes('LineChart') || code.includes('BarChart') || code.includes('PieChart');
  const hasFirestoreUsage =
    code.includes('firebaseService.addOracleLog') || code.includes('addOracleLog(') || code.includes('getOracleLogs(');

  // If the generated code already includes the requested features, don't inject.
  // (Still allow partial injection: e.g. wants chart but no chart kit.)
  const enableReminders = wantsReminders && !hasNotifications;
  const enableTracking = wantsTracking && !hasFirestoreUsage;
  const enableChart = wantsChart && !hasChartKit;

  if (!enableReminders && !enableTracking && !enableChart) return code;

  // We inject a wrapper around the default export, and optionally add required imports.
  let source = code;

  // Ensure React identifier exists for the wrapper (we use React.useState/etc to avoid named import conflicts).
  if (!/import\s+(\*\s+as\s+)?React\b/.test(source)) {
    source = `import React from 'react';\n` + source;
  }

  if (enableReminders && !source.includes("from 'expo-notifications'")) {
    source = `import * as Notifications from 'expo-notifications';\n` + source;
  }
  if ((enableTracking || enableChart) && !source.includes("from '@react-native-async-storage/async-storage'")) {
    source = `import AsyncStorage from '@react-native-async-storage/async-storage';\n` + source;
  }
  if (enableChart && !source.includes("from 'react-native-chart-kit'")) {
    source = `import { LineChart } from 'react-native-chart-kit';\n` + source;
  }
  // RN imports are safe to add as an additional import statement (no default import duplication).
  const rnNeeds =
    enableReminders || enableTracking || enableChart
      ? `import { View, Text, TouchableOpacity, StyleSheet, Alert, Dimensions, Switch } from 'react-native';\n`
      : '';
  if (rnNeeds) {
    source = rnNeeds + source;
  }

  // Rewrite the default export into a named inner component so we can wrap it.
  // Supported patterns:
  // - export default function Name(...) { ... }
  // - export default function(...) { ... }
  // - export default Name;
  // If unsupported, skip injection to avoid breaking code.
  let innerName = '__OracleInner';
  if (/export\s+default\s+function\s+[A-Za-z0-9_]+\s*\(/.test(source)) {
    const m = source.match(/export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/);
    if (!m) return code;
    innerName = m[1];
    source = source.replace(/export\s+default\s+function\s+([A-Za-z0-9_]+)\s*\(/, `function ${innerName}(`);
  } else if (/export\s+default\s+function\s*\(/.test(source)) {
    source = source.replace(/export\s+default\s+function\s*\(/, `const ${innerName} = function(`);
  } else if (/export\s+default\s+[A-Za-z0-9_]+\s*;/.test(source)) {
    const m = source.match(/export\s+default\s+([A-Za-z0-9_]+)\s*;/);
    if (!m) return code;
    innerName = m[1];
    source = source.replace(/export\s+default\s+[A-Za-z0-9_]+\s*;/, '');
  } else {
    return code;
  }

  const enableFlags = {
    reminders: enableReminders,
    tracking: enableTracking,
    chart: enableChart,
  };

  const wrapper = `

// ORACLEFORGE_AUTO_FEATURES
const __AUTO_ENABLE_REMINDERS = ${enableFlags.reminders ? 'true' : 'false'};
const __AUTO_ENABLE_TRACKING = ${enableFlags.tracking ? 'true' : 'false'};
const __AUTO_ENABLE_CHART = ${enableFlags.chart ? 'true' : 'false'};

function OracleForgeAutoFeaturesWrapper(props) {
  const [panelOpen, setPanelOpen] = React.useState(true);
  const [busy, setBusy] = React.useState(false);

  // Reminders
  const [remindersEnabled, setRemindersEnabled] = React.useState(false);
  const [notificationIds, setNotificationIds] = React.useState([]);

  // Tracking
  const [logs, setLogs] = React.useState([]);
  const [streak, setStreak] = React.useState(0);

  const screenWidth = Dimensions.get('window').width;
  const storageKey = 'oracle_' + props.oracleId + '_auto_features';

  const todayKey = React.useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return yyyy + '-' + mm + '-' + dd;
  }, []);

  const computeStreakFromLogs = React.useCallback((rawLogs) => {
    const daysWithLogs = new Set();
    for (const l of rawLogs || []) {
      if (l && l.date) daysWithLogs.add(String(l.date));
    }

    let s = 0;
    const start = new Date();
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = yyyy + '-' + mm + '-' + dd;
      if (daysWithLogs.has(key)) s += 1;
      else break;
    }
    return s;
  }, []);

  const loadAutoState = React.useCallback(async () => {
    try {
      const saved = await AsyncStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.remindersEnabled === 'boolean') setRemindersEnabled(parsed.remindersEnabled);
        if (Array.isArray(parsed.notificationIds)) setNotificationIds(parsed.notificationIds);
      }
    } catch (e) {
      console.log('[AutoFeatures] Load failed', e);
    }
  }, [storageKey]);

  const saveAutoState = React.useCallback(async (next) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(next));
    } catch (e) {
      console.log('[AutoFeatures] Save failed', e);
    }
  }, [storageKey]);

  const refreshLogs = React.useCallback(async () => {
    if (!__AUTO_ENABLE_TRACKING) return;
    if (!props.firebaseService?.getOracleLogs) return;
    try {
      setBusy(true);
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6);
      const startIso = start.toISOString().split('T')[0];
      const endIso = end.toISOString().split('T')[0];
      const fetched = await props.firebaseService.getOracleLogs(props.oracleId, {
        startDate: startIso,
        endDate: endIso,
      });
      const normalized = (fetched || []).map((l) => ({
        ...l,
        date: l.date || (l.timestamp ? String(l.timestamp).split('T')[0] : undefined),
      }));
      setLogs(normalized);
      setStreak(computeStreakFromLogs(normalized));
    } catch (e) {
      console.log('[AutoFeatures] Log fetch failed', e);
    } finally {
      setBusy(false);
    }
  }, [computeStreakFromLogs, props.firebaseService, props.oracleId]);

  const addQuickLog = React.useCallback(async () => {
    if (!__AUTO_ENABLE_TRACKING) return;
    if (!props.firebaseService?.addOracleLog) return;
    try {
      setBusy(true);
      await props.firebaseService.addOracleLog(props.oracleId, {
        type: 'auto_track',
        value: 1,
        timestamp: new Date().toISOString(),
        date: todayKey,
        metadata: { source: 'auto_features' },
      });
      await refreshLogs();
    } catch (e) {
      console.log('[AutoFeatures] Add log failed', e);
      Alert.alert('Error', 'Could not log this action. Try again.');
    } finally {
      setBusy(false);
    }
  }, [props.firebaseService, props.oracleId, refreshLogs, todayKey]);

  const ensureNotificationPermissions = React.useCallback(async () => {
    try {
      const perm = await Notifications.requestPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Notifications disabled', 'Enable notifications to use reminders.');
        return false;
      }
      return true;
    } catch (e) {
      console.log('[AutoFeatures] Permission error', e);
      return false;
    }
  }, []);

  const disableReminders = React.useCallback(async () => {
    try {
      for (const id of notificationIds) {
        try {
          await Notifications.cancelScheduledNotificationAsync(id);
        } catch {}
      }
    } finally {
      setNotificationIds([]);
      setRemindersEnabled(false);
      await saveAutoState({ remindersEnabled: false, notificationIds: [] });
    }
  }, [notificationIds, saveAutoState]);

  const enableDefaultReminders = React.useCallback(async () => {
    const ok = await ensureNotificationPermissions();
    if (!ok) return;
    try {
      // Schedule two daily reminders by default (simple + safe).
      const ids = [];
      const id1 = await Notifications.scheduleNotificationAsync({
        content: { title: 'Reminder', body: 'Time for your oracle check-in' },
        trigger: { hour: 10, minute: 0, repeats: true },
      });
      ids.push(id1);
      const id2 = await Notifications.scheduleNotificationAsync({
        content: { title: 'Reminder', body: 'Don\\'t forget your progress today' },
        trigger: { hour: 16, minute: 0, repeats: true },
      });
      ids.push(id2);
      setNotificationIds(ids);
      setRemindersEnabled(true);
      await saveAutoState({ remindersEnabled: true, notificationIds: ids });
    } catch (e) {
      console.log('[AutoFeatures] Schedule failed', e);
      Alert.alert('Error', 'Could not schedule reminders.');
    }
  }, [ensureNotificationPermissions, saveAutoState]);

  React.useEffect(() => {
    if (__AUTO_ENABLE_REMINDERS || __AUTO_ENABLE_TRACKING || __AUTO_ENABLE_CHART) {
      loadAutoState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    if (__AUTO_ENABLE_TRACKING) {
      refreshLogs();
    }
  }, [__AUTO_ENABLE_TRACKING, refreshLogs]);

  const chartData = React.useMemo(() => {
    if (!__AUTO_ENABLE_CHART) return null;
    const end = new Date();
    const labels = [];
    const counts = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(end.getDate() - i);
      const label = ['S','M','T','W','T','F','S'][d.getDay()];
      labels.push(label);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const key = yyyy + '-' + mm + '-' + dd;
      const c = (logs || []).filter(l => String(l.date) === key).length;
      counts.push(c);
    }
    return { labels, datasets: [{ data: counts }] };
  }, [logs]);

  const chartConfig = React.useMemo(() => ({
    backgroundColor: '#0A0A0A',
    backgroundGradientFrom: '#141414',
    backgroundGradientTo: '#0A0A0A',
    decimalPlaces: 0,
    color: (opacity = 1) => 'rgba(10, 255, 230, ' + opacity + ')',
    labelColor: (opacity = 1) => 'rgba(255, 255, 255, ' + opacity + ')',
    style: { borderRadius: 12 },
    propsForDots: { r: '4' },
  }), []);

  const toggleReminders = React.useCallback(async (next) => {
    if (!__AUTO_ENABLE_REMINDERS) return;
    if (next) await enableDefaultReminders();
    else await disableReminders();
  }, [disableReminders, enableDefaultReminders]);

  if (!(__AUTO_ENABLE_REMINDERS || __AUTO_ENABLE_TRACKING || __AUTO_ENABLE_CHART)) {
    return <${innerName} {...props} />;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={__autoStyles.card}>
        <TouchableOpacity onPress={() => setPanelOpen(!panelOpen)} style={__autoStyles.headerRow}>
          <Text style={__autoStyles.title}>Auto Features</Text>
          <Text style={__autoStyles.subtitle}>{panelOpen ? 'Hide' : 'Show'}</Text>
        </TouchableOpacity>

        {panelOpen && (
          <View style={{ gap: 12 }}>
            {__AUTO_ENABLE_REMINDERS && (
              <View style={__autoStyles.row}>
                <Text style={__autoStyles.label}>Reminders</Text>
                <Switch value={remindersEnabled} onValueChange={toggleReminders} />
              </View>
            )}

            {__AUTO_ENABLE_TRACKING && (
              <View style={{ gap: 10 }}>
                <View style={__autoStyles.metricsRow}>
                  <View style={__autoStyles.metric}>
                    <Text style={__autoStyles.metricValue}>{streak}</Text>
                    <Text style={__autoStyles.metricLabel}>Streak</Text>
                  </View>
                  <View style={__autoStyles.metric}>
                    <Text style={__autoStyles.metricValue}>{(logs || []).length}</Text>
                    <Text style={__autoStyles.metricLabel}>7d Logs</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[__autoStyles.button, busy && { opacity: 0.6 }]}
                  disabled={busy}
                  onPress={addQuickLog}
                >
                  <Text style={__autoStyles.buttonText}>{busy ? 'Working…' : 'Log +1'}</Text>
                </TouchableOpacity>
              </View>
            )}

            {__AUTO_ENABLE_CHART && chartData && (
              <View style={{ marginTop: 6 }}>
                <LineChart
                  data={chartData}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={chartConfig}
                  bezier
                  style={{ borderRadius: 12 }}
                />
              </View>
            )}
          </View>
        )}
      </View>

      <View style={{ flex: 1 }}>
        <${innerName} {...props} />
      </View>
    </View>
  );
}

const __autoStyles = StyleSheet.create({
  card: {
    backgroundColor: '#0A0A0A',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 14,
    padding: 14,
    margin: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  subtitle: {
    color: '#888888',
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metric: {
    flex: 1,
    backgroundColor: '#141414',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F1F1F',
  },
  metricValue: {
    color: '#0AFFE6',
    fontSize: 18,
    fontWeight: '800',
  },
  metricLabel: {
    color: '#888888',
    fontSize: 12,
    marginTop: 2,
  },
  button: {
    backgroundColor: '#0AFFE6',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default OracleForgeAutoFeaturesWrapper;
`;

  return source + wrapper;
};

const cleanAiGeneratedCode = (input: string, promptText: string): string => {
  let code = stripMarkdownCodeFences(input);

  code = maybeAugmentMissingFeatures(code, promptText);

  // Normalize line endings
  code = code.replace(/\r\n/g, '\n');

  // Ensure import lines end with semicolons (helps some parsers / transforms)
  code = code
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('import ') && !trimmed.endsWith(';')) return line + ';';
      return line;
    })
    .join('\n');

  // Fix a common AI JSX error: missing closing ">" on a single-line opening tag.
  // Only apply when the line looks "complete" (ends with } or ").
  const jsxTags = ['View', 'Text', 'ScrollView', 'TouchableOpacity', 'TextInput'];
  code = code
    .split('\n')
    .map(line => {
      if (line.includes('</')) return line;
      if (line.includes('>') || line.includes('/>')) return line;
      for (const tag of jsxTags) {
        const re = new RegExp(`^\\s*<${tag}\\b[\\s\\S]*[\\}\\"]\\s*$`);
        if (re.test(line)) return line + '>';
      }
      return line;
    })
    .join('\n');

  // Naively balance braces if we're missing a small number at EOF (common truncated output issue).
  const open = (code.match(/\{/g) || []).length;
  const close = (code.match(/\}/g) || []).length;
  const diff = open - close;
  if (diff > 0 && diff <= 3) {
    code = code + '\n' + Array(diff).fill('}').join('\n');
  }

  return code.trim();
};

const transpileCode = (code: string, promptText: string): { transpiled: string; cleaned: string } => {
  try {
    console.log('[Babel] Starting transpilation...');
    const cleaned = cleanAiGeneratedCode(code, promptText);
    console.log('[Babel] Cleaned code preview:', cleaned.substring(0, 400));

    const result = Babel.transform(cleaned, {
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
    return { transpiled: result.code, cleaned };
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

const createOracleComponent = (code: string, promptText: string) => {
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
    const { transpiled, cleaned } = transpileCode(code, promptText);
    console.log('[DynamicOracle] Cleaned code preview:', cleaned.substring(0, 400));

    if (!transpiled) {
      throw new Error('Transpilation failed: empty output');
    }

    console.log('[DynamicOracle] Transpiled code preview:', transpiled.substring(0, 200));

    const context = createExecutionContext();

    // Create module structure
    const module = { exports: {} as any };
    const exports = module.exports;
    const require = (name: string) => {
      if (name === 'react') return React;
      if (name === 'react-native')
        return {
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
        };
      if (name === '@react-native-async-storage/async-storage') return AsyncStorage;
      if (name === 'expo-notifications') return Notifications;
      if (name === 'react-native-chart-kit') return { BarChart, PieChart, LineChart };
      if (name === 'lucide-react-native') return context;
      throw new Error(`Module not found: ${name}`);
    };

    // Use eval instead of new Function to support async/await
    // Wrap in an IIFE to create proper scope
    const evalCode = `
      (function(module, exports, require, ${Object.keys(context).join(', ')}) {
        ${transpiled}
        return module.exports.default || module.exports;
      })
    `;

    console.log('[DynamicOracle] Executing component code...');

    // Execute the code with eval (safe because we control the source via AI)
    const componentFactory = eval(evalCode) as any;
    const LoadedComponent = componentFactory(module, exports, require, ...Object.values(context));

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

    if (
      errorMsg.includes('sandbox') ||
      errorMsg.includes('timeout') ||
      errorMsg.includes('TimeoutError') ||
      errorMsg.includes('not found') ||
      errorName === 'TimeoutError'
    ) {
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
  const autoFixAttemptedRef = useRef<Set<string>>(new Set());
  
  const accent = config?.accentColor || '#0AFFE6';
  const promptText = (config?.description || config?.name || '').toString();

  useEffect(() => {
    let cancelled = false;

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
      const run = async () => {
        try {
          const component = createOracleComponent(code, promptText);
          if (cancelled) return;

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

          const looksLikeTranspileOrSyntax =
            errorMessage.includes('Transpilation failed') ||
            errorMessage.includes('Invalid JSX syntax') ||
            errorMessage.includes('Syntax Error') ||
            errorMessage.includes('Unexpected token');

          const autoFixKey = `${code.length}:${code.slice(0, 80)}`;

          if (looksLikeTranspileOrSyntax && !autoFixAttemptedRef.current.has(autoFixKey)) {
            autoFixAttemptedRef.current.add(autoFixKey);
            console.log('[DynamicRenderer] Attempting auto-fix via Grok (syntax repair)...');

            try {
              const fixed = await refineOracleCode(
                code,
                'Fix syntax errors in this code. Return ONLY the complete corrected code.',
                []
              );

              if (cancelled) return;
              console.log('[DynamicRenderer] Auto-fix returned code length:', fixed.code.length);
              console.log('[DynamicRenderer] Auto-fix code preview:', fixed.code.substring(0, 400));

              const fixedComponent = createOracleComponent(fixed.code, promptText);
              if (cancelled) return;

              if (fixedComponent) {
                setGeneratedComponent(() => fixedComponent);
                setError(null);
                console.log('[DynamicRenderer] Auto-fix succeeded');
              } else {
                setGeneratedComponent(null);
                setError(null);
                console.log('[DynamicRenderer] Auto-fix produced no component, using fallback');
              }

              setIsLoading(false);
              return;
            } catch (fixErr: any) {
              console.error('[DynamicRenderer] Auto-fix failed:', fixErr);
              // continue into normal error handling below
            }
          }
          
          if (
            errorMessage.includes('sandbox') ||
            errorMessage.includes('timeout') ||
            errorMessage.includes('TimeoutError') ||
            errorMessage.includes('not found') ||
            errorName === 'TimeoutError'
          ) {
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
      };

      void run();
    }, 0);
    
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
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
