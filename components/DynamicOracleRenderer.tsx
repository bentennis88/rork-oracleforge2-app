import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Babel from '@babel/standalone';
import { transpileAsync } from './transpiler';

// Preserve global Map before any imports can shadow it
const GlobalMap = globalThis.Map;

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Button,
  TextInput,
  ScrollView,
  Alert,
  Platform,
  Share,
  Dimensions,
  FlatList,
  SectionList,
  Switch,
  Modal,
  Animated,
  Easing,
  ActivityIndicator,
  KeyboardAvoidingView,
  Pressable,
  StatusBar,
  Image as RNImage,
  Vibration,
  Linking,
  AppState,
  Keyboard as RNKeyboard,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { initializeApp as firebaseInitializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, get, remove, update } from 'firebase/database';
import firebaseConfigDefault, { db as firestoreDb, database as firebaseDatabase, app as firebaseApp } from '@/config/firebase';
import {
  Check, Plus, Minus, Trash2, RefreshCw, Share2, ShoppingCart, Droplet, Flame,
  TrendingUp, TrendingDown, Clock, Zap, Heart, Star, Calendar, Target, Award,
  Bell, Activity, DollarSign, BarChart3, Coffee, Moon, Sun, Edit2, Save, X, History,
  ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Search, Filter, Settings, User, Home, MapPin,
  Phone, Mail, Camera, Image, Play, Pause, Square, Circle, Triangle,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Volume2, VolumeX,
  Wifi, Battery, Bluetooth, Lock, Unlock, Eye, EyeOff, Copy, Clipboard as ClipboardIcon,
  Download, Upload, Link, ExternalLink, Bookmark, Tag, Hash, AtSign,
  MessageCircle, Send, Paperclip, File, Folder, Archive, Package, Gift,
  CreditCard, Wallet, PiggyBank, Receipt, Calculator, Percent, Timer,
  Album, Hourglass, Watch, Sunrise, Sunset, Cloud, CloudRain, Snowflake,
  Wind, Thermometer, Umbrella, Briefcase, Building, Store, Truck, Car,
  Bike, Plane, Train, Ship, Anchor, Flag, Compass, Navigation, Globe,
  Mountain, Flower, Leaf, Apple, Pizza, Utensils, Wine, Beer, Cake,
  Pill, Stethoscope, Syringe, Bandage, Dumbbell, Trophy, Medal,
  Crown, Gem, Sparkles, Wand2, Lightbulb, Rocket, Puzzle, Gamepad, Dice5,
  Music, Headphones, Mic, Video, Tv, Monitor, Smartphone, Tablet, Laptop,
  Keyboard as KeyboardIcon, Mouse, Printer, Server, Database, HardDrive, Cpu, Code, Terminal,
  Bug, Shield, Key, Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
  ListTodo, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
  MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
  Repeat, SkipForward, SkipBack, FastForward, Rewind, StopCircle, PlayCircle, PauseCircle,
  CircleDot, Crosshair, Sliders, Move, ZoomIn, ZoomOut, RotateCw, Undo, Redo,
  Trash, Edit, Edit3 as EditIcon, PlusCircle, MinusCircle, XCircle, CheckCircle,
  AlertTriangle, BellRing, BellOff, CalendarCheck, CalendarX, ListChecks, ListOrdered,
  SortAsc, SortDesc, Shuffle, ArrowUpDown, LogOut, LogIn, Power, RefreshCcw,
  // Additional commonly used icons
  Book, BookOpen, Pencil, PenTool, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Bold, Italic, Underline, List, FileText, FilePlus, FileEdit, FolderOpen, FolderPlus,
  Users, UserPlus, UserMinus, UserCheck, UserX, MessageSquare, MessagesSquare,
  ThumbsUp, ThumbsDown, Smile, Frown, Meh, AlertOctagon, Ban, XOctagon,
  Voicemail, PhoneCall, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed,
  Wifi as WifiIcon, WifiOff, Signal, Radio, Rss, Cast, Airplay,
  Battery as BatteryIcon, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning,
  Sun as SunIcon, Moon as MoonIcon, CloudSun, Stars, Cloudy,
  Dribbble, Github, Twitter, Facebook, Instagram, Linkedin, Youtube,
  Globe2, Map as MapIcon, MapPinned, Route, Signpost, Milestone,
  ShoppingBag, Barcode, ScanLine, Tags, Coins, Banknote,
  GraduationCap, School, Library, Pen, Eraser, Highlighter, Ruler,
  Wrench, Hammer, Screwdriver, Construction, HardHat, Cog, Cogs,
  Flame as FlameIcon, Droplets, Waves, Snowflake as SnowflakeIcon, Rainbow, Tornado,
  Baby, Dog, Cat, Bird, Fish, Bug as BugIcon, Rat, Rabbit,
  Footprints, Accessibility, Ear, Hand, Bone, Brain, Eye as EyeIcon,
  Bed, Sofa, Lamp, DoorOpen, DoorClosed, Window, Fence,
  Tent, Caravan, Trees, PalmTree, TreeDeciduous, TreePine, Cactus,
  Grape, Cherry, Banana, Citrus, Carrot, Salad, Egg, Croissant,
  IceCream, Cookie, Candy, Popcorn, Soup, Drumstick, Sandwich,
  Cigarette, Wine as WineIcon, Martini, GlassWater, Cup, Milk,
  Shirt, Watch as WatchIcon, Glasses, Hat, Ribbon, Scissors, Brush,
  Palette, Paintbrush, PaintBucket, Pipette, Shapes, Pentagon, Octagon,
  Disc, DiscAlbum, Radio as RadioIcon, Speaker, SpeakerIcon,
} from 'lucide-react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import colors from '@/constants/colors';

// Simple hash function for cache keys (faster than storing full source)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(36);
}

// Global in-memory LRU cache shared across all DynamicOracleRenderer instances
// Uses GlobalMap to avoid shadowing issues with lucide-react-native's Map icon
class LRUCache<K, V> {
  size: number;
  map: globalThis.Map<K, V>;
  constructor(size = 10) {
    this.size = size;
    this.map = new GlobalMap();
  }
  get(key: K) {
    const v = this.map.get(key);
    if (v === undefined) return undefined;
    // refresh order
    this.map.delete(key);
    this.map.set(key, v);
    return v;
  }
  set(key: K, value: V) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, value);
    // evict oldest
    while (this.map.size > this.size) {
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }
  has(key: K) {
    return this.map.has(key);
  }
  clear() {
    this.map.clear();
  }
  keys() {
    return Array.from(this.map.keys());
  }
}

// GLOBAL caches - shared across all renderer instances for efficiency
const GLOBAL_CACHE_SIZE = parseInt(String(process.env.EXPO_PUBLIC_ORACLE_CACHE_SIZE || '20'), 10) || 20;
const globalComponentCache = new LRUCache<string, React.ComponentType>(GLOBAL_CACHE_SIZE);
const globalTranspileCache = new LRUCache<string, string>(GLOBAL_CACHE_SIZE * 2); // Transpiled code is cheaper to store

// Persistent transpile cache using AsyncStorage
const TRANSPILE_CACHE_KEY = '@oracle_transpile_cache';
const TRANSPILE_CACHE_VERSION = 'v10'; // v10: fix misplaced parentheses in property access (data.(prop) -> (data.prop))
const TRANSPILE_CACHE_VERSION_KEY = '@oracle_transpile_cache_version';
let persistentCacheLoaded = false;
let persistentCachePromise: Promise<void> | null = null;

async function loadPersistentCache(): Promise<void> {
  if (persistentCacheLoaded) return;
  if (persistentCachePromise) return persistentCachePromise;
  
  persistentCachePromise = (async () => {
    try {
      // Check cache version first
      const storedVersion = await AsyncStorage.getItem(TRANSPILE_CACHE_VERSION_KEY);
      if (storedVersion !== TRANSPILE_CACHE_VERSION) {
        // Cache is outdated, clear it
        console.log(`[DynamicOracle] Cache version mismatch (stored: ${storedVersion}, current: ${TRANSPILE_CACHE_VERSION}), clearing cache`);
        await AsyncStorage.removeItem(TRANSPILE_CACHE_KEY);
        await AsyncStorage.setItem(TRANSPILE_CACHE_VERSION_KEY, TRANSPILE_CACHE_VERSION);
        persistentCacheLoaded = true;
        return;
      }
      
      const cached = await AsyncStorage.getItem(TRANSPILE_CACHE_KEY);
      if (cached) {
        const entries = JSON.parse(cached);
        // Load into global transpile cache (limit to cache size)
        const keys = Object.keys(entries).slice(-GLOBAL_CACHE_SIZE * 2);
        for (const key of keys) {
          globalTranspileCache.set(key, entries[key]);
        }
        console.log(`[DynamicOracle] Loaded ${keys.length} cached transpilations from storage`);
      }
    } catch (e) {
      console.warn('[DynamicOracle] Failed to load persistent cache:', e);
    }
    persistentCacheLoaded = true;
  })();
  
  return persistentCachePromise;
}

// Debounced save to avoid excessive writes
let savePending = false;
async function savePersistentCache(): Promise<void> {
  if (savePending) return;
  savePending = true;
  
  // Debounce - wait 2 seconds before saving
  setTimeout(async () => {
    try {
      const entries: Record<string, string> = {};
      for (const key of globalTranspileCache.keys()) {
        const val = globalTranspileCache.get(key);
        if (val) entries[key] = val;
      }
      await AsyncStorage.setItem(TRANSPILE_CACHE_KEY, JSON.stringify(entries));
      console.log(`[DynamicOracle] Saved ${Object.keys(entries).length} transpilations to storage`);
    } catch (e) {
      console.warn('[DynamicOracle] Failed to save persistent cache:', e);
    }
    savePending = false;
  }, 2000);
}

// Global metrics
const globalMetrics = { cacheHits: 0, cacheMisses: 0, transpileCacheHits: 0, transforms: 0, transformTime: 0, execTime: 0 };

// Export utility functions for cache management
export function clearOracleCache(): void {
  globalComponentCache.clear();
  globalTranspileCache.clear();
  AsyncStorage.removeItem(TRANSPILE_CACHE_KEY).catch(() => {});
  console.log('[DynamicOracle] Cache cleared');
}

export function getOracleCacheStats(): typeof globalMetrics {
  return { ...globalMetrics };
}

// Pre-warm cache by loading persistent cache early
export async function preloadOracleCache(): Promise<void> {
  await loadPersistentCache();
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

interface DynamicOracleRendererProps {
  code: string;
  onError?: (error: Error) => void;
  onGoHome?: () => void;
}

export default function DynamicOracleRenderer({ code, onError, onGoHome }: DynamicOracleRendererProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use hash of code for efficient cache lookups
  const codeHash = useMemo(() => simpleHash(code), [code]);
  
  // Generation counter to ignore stale async work
  const generationRef = useRef(0);
  // Cleanup registry to allow generated code to register disposers we call on unmount
  const cleanupRegistry = useRef<(() => void)[]>([]);

  const cleanCode = (code: string) => {
    // Minimal sanitization: remove markdown fences and import statements
    let cleaned = code
      // remove fenced code blocks
      .replace(/```(?:typescript|tsx|jsx|javascript|js)?\s*/g, '')
      .replace(/```\s*$/g, '')
      // remove top-level import lines (dependencies are injected)
      .replace(/^import\s.+?from\s+['"][^'"]+['"];?\s*$/gm, '')
      .replace(/^import\s+.+?;?\s*$/gm, '')
      // disable console to avoid noisy behavior
      .replace(/console\.log/g, '// console.log')
      .trim();

    return cleaned;
  };

  // Preprocess generated code to strip firebase configuration (we inject it via context)
  const preprocessGeneratedCode = (raw: string) => {
    let out = raw;

    try {
      // Remove any firebaseConfig object literal (robust regex, non-greedy)
      out = out.replace(/const\s+firebaseConfig\s*=\s*\{[\s\S]*?\};?/g, '');
      out = out.replace(/(?:let|var)\s+firebaseConfig\s*=\s*\{[\s\S]*?\};?/g, '');

      // Remove ENTIRE lines containing firebase initialization (not just function calls)
      // This prevents leaving behind dangling `const app = ` or `const database = `
      out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*initializeApp\s*\([^)]*\).*$/gm, '');
      out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*getDatabase\s*\([^)]*\).*$/gm, '');
      out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*getFirestore\s*\([^)]*\).*$/gm, '');
      out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*getAuth\s*\([^)]*\).*$/gm, '');
      out = out.replace(/^.*firebase\.initializeApp\s*\([^)]*\).*$/gm, '');

      // Remove standalone calls (without assignment)
      out = out.replace(/^\s*initializeApp\s*\([^)]*\)\s*;?\s*$/gm, '');
      out = out.replace(/^\s*getDatabase\s*\([^)]*\)\s*;?\s*$/gm, '');

      // Remove any stray appId-like broken tokens (common AI hallucination)
      out = out.replace(/android:\s*['"][^'\"]*['"]/gi, '');
      out = out.replace(/appId\s*:\s*['"][^'\"]*['"],?/gi, '');
      out = out.replace(/ios:\s*['"][^'\"]*['"]/gi, '');
      
      // Remove malformed appId patterns that cause parse errors
      out = out.replace(/:\s*"1:[^"]*android:[^"]*"/gi, ':""');
      out = out.replace(/:\s*'1:[^']*android:[^']*'/gi, ":''");

      // Remove common placeholders
      out = out.replace(/YOUR_API_KEY/g, '""');
      out = out.replace(/YOUR_AUTH_DOMAIN/g, '""');
      out = out.replace(/YOUR_PROJECT_ID/g, '""');
      out = out.replace(/YOUR_DATABASE_URL/g, '""');
      out = out.replace(/YOUR_STORAGE_BUCKET/g, '""');
      out = out.replace(/YOUR_MESSAGING_SENDER_ID/g, '""');
      out = out.replace(/YOUR_APP_ID/g, '""');

      // Remove dangling variable declarations left after stripping (e.g., `const database = ` with no value)
      out = out.replace(/^[\t ]*(?:const|let|var)\s+\w+\s*=\s*[\r\n]+/gm, '');
      out = out.replace(/^[\t ]*(?:const|let|var)\s+\w+\s*=\s*;/gm, '');

      // Clean up dangling commas after removals
      out = out.replace(/,\s*,/g, ',');
      out = out.replace(/\{\s*,/g, '{');
      out = out.replace(/,\s*\}/g, '}');
      out = out.replace(/,\s*\]/g, ']');

      // Clean up multiple consecutive blank lines
      out = out.replace(/\n{3,}/g, '\n\n');

      // Trim top-of-file junk up to first component/export
      const { trimmed, removed } = trimToFirstComponent(out);
      if (removed && removed.trim()) {
        console.log('[DynamicOracle] Trimmed top-of-file junk (preview):', removed.slice(0, 300).replace(/\n/g, '\\n'));
      }

      // DO NOT inject any firebase config - rely entirely on execution context
      out = trimmed;
    } catch (e) {
      console.warn('[DynamicOracle] preprocessGeneratedCode failed:', e);
    }

    return out;
  };

  // Small heuristic auto-fixer for common simple syntax mistakes from generated code
  const simpleAutoFix = (src: string) => {
    let s = src;
    try {
      // PRIORITY 1: Fix malformed numeric property values like `prop:6"` or `prop:600"`
      // These patterns have a trailing quote but missing opening quote
      // Must run FIRST before any other fixes
      
      // Fix pattern: word:number" followed by comma, space, or closing brace
      // e.g., r:6", strokeWidth:2", fontWeight:600"
      s = s.replace(/(\w+)\s*:\s*(\d+)"\s*,\s*/g, (match, prop, num) => {
        if (prop === 'fontWeight') return `fontWeight: '${num}', `;
        return `${prop}: ${num}, `;
      });
      s = s.replace(/(\w+)\s*:\s*(\d+)"\s*}/g, (match, prop, num) => {
        if (prop === 'fontWeight') return `fontWeight: '${num}' }`;
        return `${prop}: ${num} }`;
      });
      s = s.replace(/(\w+)\s*:\s*(\d+)"\s*\n/g, (match, prop, num) => {
        if (prop === 'fontWeight') return `fontWeight: '${num}'\n`;
        return `${prop}: ${num}\n`;
      });
      
      // Same for single quotes
      s = s.replace(/(\w+)\s*:\s*(\d+)'\s*,\s*/g, (match, prop, num) => {
        if (prop === 'fontWeight') return `fontWeight: '${num}', `;
        return `${prop}: ${num}, `;
      });
      s = s.replace(/(\w+)\s*:\s*(\d+)'\s*}/g, (match, prop, num) => {
        if (prop === 'fontWeight') return `fontWeight: '${num}' }`;
        return `${prop}: ${num} }`;
      });
      
      // PRIORITY 2: Fix fontWeight with no quotes at all
      s = s.replace(/fontWeight\s*:\s*(\d+)(?=\s*[,}\n])/g, "fontWeight: '$1'");

      // PRIORITY 3: Fix patterns like `alignItems: center'` -> `alignItems: 'center'`
      // (missing opening quote on string values)
      s = s.replace(/:\s*([a-z][A-Za-z0-9_$]*)'/g, ": '$1'");
      s = s.replace(/:\s*([a-z][A-Za-z0-9_$]*)"/g, ': "$1"');

      // PRIORITY 4: Fix malformed member expressions like `obj.` or `obj?.` without property
      // These cause "'identifier' expected after '.' or '?.'" errors
      
      // Fix `.` or `?.` immediately before ), ], }, ;, , or newline
      s = s.replace(/\.(\s*[)\]};,\n])/g, '$1');
      s = s.replace(/\?\.\s*(?=[)\]};,\n])/g, '');
      
      // Fix `obj. ` (dot followed by space then non-identifier) - remove the dot
      s = s.replace(/(\w+)\.(\s+[^a-zA-Z_$])/g, '$1$2');
      s = s.replace(/(\w+)\?\.\s+([^a-zA-Z_$])/g, '$1$2');
      
      // Fix `.` or `?.` before operators like +, -, *, /, =, etc
      s = s.replace(/\.(\s*[+\-*/%=<>&|!])/g, '$1');
      s = s.replace(/\?\.(\s*[+\-*/%=<>&|!])/g, '$1');
      
      // Fix trailing dots at end of expressions: `foo.bar.` -> `foo.bar`
      s = s.replace(/\.(\s*$)/gm, '$1');
      
      // Fix `?.` or `.` before template literals
      s = s.replace(/\.\s*(`)/g, ' + $1');
      s = s.replace(/\?\.\s*(`)/g, ' + $1');
      
      // Fix spread operators FIRST - ensure all spread patterns have exactly 3 dots
      // This handles corrupted spread like `..foo`, `....foo`, `[..arr`, `{..obj`
      
      // Fix spread inside array literals: [..( or [..var -> [...( or [...var
      s = s.replace(/\[\s*\.\.([^.])/g, '[...$1');
      
      // Fix spread inside object literals: {..( or {..var -> {...( or {...var  
      s = s.replace(/\{\s*\.\.([^.])/g, '{...$1');
      
      // Fix spread after comma: , ..( or , ..var -> , ...( or , ...var
      s = s.replace(/,\s*\.\.([^.])/g, ', ...$1');
      
      // Fix any remaining double-dot spread patterns: ..var -> ...var (but NOT ... which is already correct)
      s = s.replace(/\.\.([a-zA-Z_$\(])/g, '...$1');
      
      // Fix 4+ dots down to spread operator
      s = s.replace(/\.{4,}/g, '...');
      
      // Fix double dots `..` in non-spread contexts (e.g., `foo..bar`) 
      // ONLY match .. that is NOT at start of expression (not preceded by [ { , or space+operator context)
      // AND not followed by a character that would make it a spread  
      s = s.replace(/(\w)\.\.(\w)/g, '$1.$2');  // foo..bar -> foo.bar
      
      // Fix `.` before keywords (return, const, let, if, etc)
      s = s.replace(/\.\s*\b(return|const|let|var|if|else|for|while|switch|case|break|continue|function|async|await)\b/g, '; $1');

      // PRIORITY 5: Fix nested ScrollView/FlatList issues
      // Add nestedScrollEnabled={true} to FlatList if not already present
      s = s.replace(/<FlatList(?![^>]*nestedScrollEnabled)/g, '<FlatList nestedScrollEnabled={true}');
      
      // If code has both ScrollView and FlatList, convert outer ScrollView to View
      // to prevent "VirtualizedLists should never be nested inside plain ScrollViews" error
      if (/<ScrollView[\s\S]*<FlatList/m.test(s)) {
        // Replace ScrollView that wraps FlatList with View (keeping style props)
        // This is a heuristic - replace <ScrollView with <View and </ScrollView> with </View>
        // when there's a FlatList somewhere in the code
        s = s.replace(/<ScrollView(\s+[^>]*)?>/g, (match, attrs) => {
          // Keep contentContainerStyle and convert to style, remove scroll-specific props
          let viewAttrs = attrs || '';
          viewAttrs = viewAttrs.replace(/\bcontentContainerStyle=/g, 'style=');
          viewAttrs = viewAttrs.replace(/\bshowsVerticalScrollIndicator=\{[^}]+\}/g, '');
          viewAttrs = viewAttrs.replace(/\bshowsHorizontalScrollIndicator=\{[^}]+\}/g, '');
          viewAttrs = viewAttrs.replace(/\bkeyboardShouldPersistTaps="[^"]+"/g, '');
          viewAttrs = viewAttrs.replace(/\bkeyboardShouldPersistTaps='[^']+'/g, '');
          viewAttrs = viewAttrs.replace(/\bbounces=\{[^}]+\}/g, '');
          return `<View${viewAttrs}>`;
        });
        s = s.replace(/<\/ScrollView>/g, '</View>');
        console.log('[DynamicOracle] Converted ScrollView to View to fix nested FlatList issue');
      }

      // PRIORITY 6: Replace JSON.parse/stringify with safe versions to prevent "Unexpected character: o" errors
      // This happens when AI code does JSON.parse on already-parsed data from AsyncStorage
      s = s.replace(/\bJSON\.parse\s*\(/g, 'safeJSONParse(');
      s = s.replace(/\bJSON\.stringify\s*\(/g, 'safeJSONStringify(');

      // PRIORITY 7: (Spread operators already fixed in PRIORITY 4 block above)

      // PRIORITY 7.5: Fix AI typos with apostrophes
      // AI sometimes generates `item's.id` instead of `item.id` or `item's` instead of `item`
      // This is a common hallucination pattern
      s = s.replace(/'s\./g, '.');  // item's.id -> item.id
      s = s.replace(/'s(?=\s*[,)\];}])/g, '');  // item's at end of expression -> item
      s = s.replace(/'s(?=\s*=>)/g, '');  // item's => -> item =>

      // PRIORITY 7.6: Fix unterminated string constants in object literals
      // AI sometimes generates malformed objects like:
      // { title: 'Psalm 23: 1, text: 'The Lord is my shepherd' }
      // where title should be closed before text: property
      // Pattern: property: 'value, nextProperty: 'value' -> property: 'value', nextProperty: 'value'
      
      // Fix common property names that appear inside unclosed strings
      // Look for patterns like: property: 'anything, knownProperty: 'value
      const knownProps = ['text', 'title', 'id', 'name', 'category', 'value', 'label', 'description', 'content', 'data', 'type', 'key', 'style'];
      for (const prop of knownProps) {
        // Pattern: someProperty: 'some text, knownProp: 'more text
        // This needs to become: someProperty: 'some text', knownProp: 'more text
        const pattern1 = new RegExp(`(\\w+:\\s*')([^']*),\\s*(${prop}):\\s*'`, 'g');
        s = s.replace(pattern1, "$1$2', $3: '");
        
        // Same for double quotes
        const pattern2 = new RegExp(`(\\w+:\\s*")([^"]*),\\s*(${prop}):\\s*"`, 'g');
        s = s.replace(pattern2, '$1$2", $3: "');
      }
      
      // Fix time strings with space after colon: '08: 00 -> '08:00'
      // This is a specific known AI error pattern
      s = s.replace(/'(\d{1,2}):\s+(\d{2})(?=[,\s;})\]])/g, "'$1:$2'");  // '08: 00 -> '08:00'
      s = s.replace(/"(\d{1,2}):\s+(\d{2})(?=[,\s;})\]])/g, '"$1:$2"');  // "08: 00 -> "08:00"
      
      // PRIORITY 7.7: Fix Bible verse references with unquoted numbers after colon
      // AI generates: 'Psalm 23: 1 -> should be 'Psalm 23:1' 
      // Pattern: 'Book chapter: verse (without closing quote before comma)
      s = s.replace(/'([A-Za-z]+\s+\d+):\s*(\d+)(?=\s*,)/g, "'$1:$2'");  // 'Psalm 23: 1, -> 'Psalm 23:1',
      s = s.replace(/"([A-Za-z]+\s+\d+):\s*(\d+)(?=\s*,)/g, '"$1:$2"');

      // PRIORITY 8: Fix useEffect infinite loop patterns
      // Pattern: useEffect with state array in deps that causes infinite re-renders
      // These are common AI mistakes. We can't fully fix them but we can detect obvious cases.
      // Convert dangerous patterns like [items] or [data] in useEffect deps to []
      
      // This regex finds useEffect(() => { ... }, [someStateArray]); where the array
      // contains identifiers that look like state variables (items, data, list, etc.)
      // and the effect body contains a setState call for that same variable
      
      // Simpler fix: Find useEffect with non-empty deps that save data and make them run once
      // Pattern: useEffect that saves to AsyncStorage - should typically run on mount only
      s = s.replace(
        /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{([^}]*AsyncStorage\.setItem[^}]*)\}\s*,\s*\[[^\]]+\]\s*\)/g,
        (match, body) => {
          console.log('[DynamicOracle] Fixed potential infinite loop in useEffect with AsyncStorage.setItem');
          return `useEffect(() => {${body}}, [])`; // Convert to empty deps
        }
      );
      
      // Pattern: useEffect with array literal in deps (common mistake)
      // e.g., useEffect(() => {}, [[items]]) - double brackets
      s = s.replace(/useEffect\s*\([^,]+,\s*\[\s*\[/g, 'useEffect(() => {}, [');

      // PRIORITY 9: Fix misplaced parentheses in property access
      // AI sometimes generates: data.(players || []).map() instead of (data.players || []).map()
      // This is a syntax error where the parenthesis is in the wrong place
      // Pattern: word.( should likely be (word.
      s = s.replace(/(\w+)\.(\()(\w+)/g, '$2$1.$3');  // data.(players -> (data.players
      
      // Also fix patterns like: data.(prop || default) -> (data.prop || default)
      s = s.replace(/(\w+)\.\((\w+)\s*\|\|/g, '($1.$2 ||');

    } catch (e) {
      console.warn('[DynamicOracle] simpleAutoFix failed:', e);
    }
    return s;
  };

  // Improve sanitizer error reporting by including a short preview of the problematic code
  const formatSanitizerError = (err: any, src: string) => {
    const msg = err && err.message ? err.message : String(err);
    const preview = (src || '').slice(0, 800).replace(/\n/g, '\\n');
    return `${msg}\n--- code preview ---\n${preview}`;
  };

  // AST-based sanitizer: parse and inspect AST for unsafe or unsupported patterns.
  const astSanitize = (src: string) => {
    const issues: string[] = [];

    let ast: any = null;
    try {
      // use Babel.transform with ast:true to get a parsed AST since Babel.parse may not be exposed
      const res = Babel.transform(src, {
        filename: 'dynamic-oracle-parse.tsx',
        ast: true,
        code: false,
        presets: ['react', 'typescript'],
      }) as any;
      ast = res && res.ast;
      if (!ast) throw new Error('AST not produced by Babel.transform');
    } catch (e: any) {
      throw new Error('Failed to parse generated code: ' + (e && e.message ? e.message : String(e)));
    }

    // simple recursive walker
    const walk = (node: any, stack: any[] = []) => {
      if (!node || typeof node !== 'object') return;

      // detect JSX elements for nested Virtualized lists
      if (node.type === 'JSXElement') {
        const opening = node.openingElement;
        let name = null;
        if (opening && opening.name) {
          if (opening.name.type === 'JSXIdentifier') name = opening.name.name;
          else if (opening.name.type === 'JSXMemberExpression' && opening.name.property) name = opening.name.property.name;
        }

        const isVirtualized = name && ['FlatList', 'SectionList', 'VirtualizedList', 'VirtualizedListBase'].includes(name);
        const isScrollView = name && ['ScrollView'].includes(name);

        // check ancestors for virtualized lists or ScrollView
        if (isVirtualized) {
          for (let i = stack.length - 1; i >= 0; i--) {
            const anc = stack[i];
            if (anc && anc.type === 'JSXElement') {
              const aNameNode = anc.openingElement && anc.openingElement.name;
              let aName = null;
              if (aNameNode) {
                if (aNameNode.type === 'JSXIdentifier') aName = aNameNode.name;
                else if (aNameNode.type === 'JSXMemberExpression' && aNameNode.property) aName = aNameNode.property.name;
              }
              if (aName && ['FlatList', 'SectionList', 'VirtualizedList', 'ScrollView'].includes(aName)) {
                // Don't reject - we auto-fix this in simpleAutoFix by converting ScrollView to View
                console.warn(`[DynamicOracle] Note: Nested virtualized list <${name}> inside <${aName}> will be auto-fixed`);
                break;
              }
            }
          }
        }

        // push current JSX node to stack for children
        stack.push(node);
        // walk children
        if (node.children && Array.isArray(node.children)) {
          node.children.forEach((c: any) => walk(c, stack));
        }
        stack.pop();
        return;
      }

      // detect CallExpression eval or NewExpression Function
      if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'eval') {
        issues.push('Use of eval() detected — rejected for safety.');
      }
      if (node.type === 'NewExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'Function') {
        issues.push('Use of Function constructor detected — rejected for safety.');
      }

      // detect require or process usage
      if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'require') {
        issues.push('Use of require() detected — not allowed in dynamic code.');
      }
      if (node.type === 'MemberExpression') {
        const obj = node.object;
        if (obj && obj.type === 'Identifier' && obj.name === 'process') {
          issues.push('Access to process detected — not allowed in dynamic code.');
        }
      }

      // generic recursion over object properties
      for (const key of Object.keys(node)) {
        const child = node[key];
        if (Array.isArray(child)) {
          child.forEach((c) => walk(c, stack));
        } else if (child && typeof child === 'object' && child.type) {
          walk(child, stack);
        }
      }
    };

    walk(ast, []);

    if (issues.length > 0) {
      throw new Error('AST sanitizer rejected generated code:\n' + issues.map((s) => `- ${s}`).join('\n'));
    }

    return true;
  };

  // Trim anything before the first likely component/export definition to avoid top-of-file junk
  const trimToFirstComponent = (src: string) => {
    const patterns = [
      /export\s+default/,
      /export\s+const\s+\w+/,
      /export\s+function\s+\w+/,
      /const\s+\w+\s*=\s*\(?\s*.*?=>/, // arrow function component
      /function\s+\w+\s*\(/,
      /class\s+\w+\s+extends\s+/,
      /const\s+\w+\s*=\s*\(/,
    ];

    let firstIndex = -1;
    for (const pat of patterns) {
      const m = src.search(pat);
      if (m !== -1 && (firstIndex === -1 || m < firstIndex)) firstIndex = m;
    }

    if (firstIndex <= 0) return { trimmed: src, removed: '' };

    const removed = src.slice(0, firstIndex);
    const trimmed = src.slice(firstIndex);
    return { trimmed, removed };
  };

  useEffect(() => {
    generationRef.current += 1;
    const gen = generationRef.current;

    let mounted = true;
    let transpiled: string | undefined;  // Declare outside try for error logging

    (async () => {
      try {
        // Load persistent cache first (only on first render)
        await loadPersistentCache();
        
        console.log('[DynamicOracle] Transpiling code...');
        setIsLoading(true);
        setError(null);
        
        // CACHE LEVEL 1: Check global component cache (fastest - already compiled)
        const cachedComponent = globalComponentCache.get(codeHash);
        if (cachedComponent) {
          globalMetrics.cacheHits += 1;
          if (!mounted || generationRef.current !== gen) return;
          setComponent(() => cachedComponent);
          setIsLoading(false);
          console.log('[DynamicOracle] component cache hit; metrics:', globalMetrics);
          return;
        }
        globalMetrics.cacheMisses += 1;

        // Preprocess placeholders and run simple autofix + AST checks before transpilation
        let preprocessed = preprocessGeneratedCode(code);
        
        // Debug: check for malformed patterns before fix
        const hasMalformedBefore = /\w+:\d+"/.test(preprocessed);
        if (hasMalformedBefore) {
          console.log('[DynamicOracle] Found malformed pattern before fix, applying simpleAutoFix');
        }
        
        preprocessed = simpleAutoFix(preprocessed);
        
        // Debug: check if fix worked
        const hasMalformedAfter = /\w+:\d+"/.test(preprocessed);
        if (hasMalformedAfter) {
          console.warn('[DynamicOracle] WARNING: Malformed pattern still present after simpleAutoFix!');
          // Extract and log the problematic line
          const lines = preprocessed.split('\n');
          for (let i = 0; i < lines.length; i++) {
            if (/\w+:\d+"/.test(lines[i])) {
              console.warn('[DynamicOracle] Problematic line', i + 1, ':', lines[i]);
            }
          }
        }
        
        // Run AST-based sanitizer to detect unsupported patterns
        try {
          astSanitize(preprocessed);
        } catch (e: any) {
          throw new Error(formatSanitizerError(e, preprocessed));
        }
        const sanitized = cleanCode(preprocessed);
        
        // Hash the sanitized code for cache lookup
        const sanitizedHash = simpleHash(sanitized);
        
        // CACHE LEVEL 2: Check transpile cache (faster than re-transpiling)
        transpiled = globalTranspileCache.get(sanitizedHash);
        
        if (transpiled) {
          globalMetrics.transpileCacheHits += 1;
          console.log('[DynamicOracle] transpile cache hit');
        } else {
          // Full transpilation required
          const t0 = Date.now();
          const transpileOptions = {
            filename: 'OracleComponent.tsx',
            sourceType: 'module',
            presets: [
              ['env', { 
                modules: 'commonjs',
                loose: true,  // Use loose mode to avoid strict ES5 class transpilation
              }],
              'react',
              'typescript',
            ],
            plugins: [
              ['proposal-class-properties', { loose: true }],
              'proposal-object-rest-spread',
            ],
          } as any;

          transpiled = await transpileAsync(sanitized, transpileOptions);
          const t1 = Date.now();
          globalMetrics.transforms += 1;
          globalMetrics.transformTime += t1 - t0;

          if (!transpiled) {
            throw new Error('Transpilation returned empty code');
          }

          // Post-process transpiled code to protect common array operations
          // Match member chains like obj.arr, obj.sub.arr, or just arr
          // Also handle function calls in the chain like getGameSummary().periods
          // Pattern: identifier (with optional member chains and function calls) followed by array method
          // IMPORTANT: Skip if already wrapped with Array.isArray or safeArray
          // ALSO: Skip if this is inside React.createElement() call to avoid JSX prop issues
          
          // APPROACH: Replace array method calls with safe wrapper functions
          // This avoids parenthesis issues by using function calls instead of inline conditionals
          // Pattern matches: identifier chains followed by .method(
          // Examples: arr.filter(, obj.items.reduce(, data.map(
          
          // List of array methods that need wrapping
          const arrayMethods = ['filter', 'map', 'reduce', 'find', 'forEach', 'some', 'every', 'includes', 'flat', 'flatMap', 'findIndex', 'indexOf', 'lastIndexOf', 'slice', 'concat', 'join', 'reverse', 'sort', 'fill', 'copyWithin', 'entries', 'keys', 'values', 'at'];
          const methodsRegex = arrayMethods.join('|');
          
          // Match any variable/property chain followed by an array method
          // Use a simpler pattern that captures the variable and replaces the method call
          // Look for: identifier.chain.method( but NOT Array.method( or already wrapped
          transpiled = transpiled.replace(
            new RegExp(`(\\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:\\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\\s*\\.\\s*(${methodsRegex})\\s*\\(`, 'g'),
            (match, chain, method) => {
              // Don't wrap if it's Array prototype method or already wrapped
              if (chain === 'Array' || chain === 'Object' || chain === 'String' || 
                  chain.startsWith('Array.') || chain.startsWith('Object.') ||
                  chain.startsWith('safeArray') || chain.startsWith('(Array')) {
                return match;
              }
              // Wrap with safe array check
              return `(Array.isArray(${chain}) ? ${chain} : []).${method}(`;
            }
          );
          
          // Protect .length access on potential non-arrays
          // Match: identifier.chain.length but NOT .length( or .length = 
          transpiled = transpiled.replace(
            /(\b[a-zA-Z_$][a-zA-Z0-9_$]*(?:\.[a-zA-Z_$][a-zA-Z0-9_$]*)*)\.length\b(?!\s*[=(])/g,
            (match, chain) => {
              // Don't wrap if already wrapped or is a string/array literal method
              if (chain === 'Array' || chain === 'String' || 
                  chain.startsWith('safeLength') || chain.startsWith('Array.isArray') ||
                  chain.startsWith('(Array')) {
                return match;
              }
              return `((${chain} && typeof ${chain}.length === 'number') ? ${chain}.length : 0)`;
            }
          );
          
          // Additional safety: wrap potential undefined object access in optional chaining
          // Pattern: catch common patterns like obj.property where obj might be undefined
          // This is a lighter touch - don't be too aggressive
          
          // Cache the transpiled code
          globalTranspileCache.set(sanitizedHash, transpiled);
          // Persist to storage (debounced)
          savePersistentCache();
        }

        console.log('[DynamicOracle] Creating component...');

        // Create a module-like exports object
        const moduleExports: any = { default: null };

        // create a safe initializeApp to avoid duplicate-app errors
        const initializeApp = (cfg: any) => {
          try {
            if (getApps && typeof getApps === 'function' && getApps().length > 0) {
              return getApp();
            }
          } catch (e) {
            // fallthrough to initialize
          }
          return firebaseInitializeApp(cfg);
        };

        // Wrap Notifications to validate triggers and avoid runtime errors
        const wrappedNotifications = {
          ...Notifications,
          // Add requestPermissionsAsync wrapper
          requestPermissionsAsync: async () => {
            try {
              return await Notifications.requestPermissionsAsync();
            } catch (e) {
              console.warn('[DynamicOracle] Notification permissions error:', e);
              return { status: 'undetermined', granted: false };
            }
          },
          // Add getPermissionsAsync wrapper
          getPermissionsAsync: async () => {
            try {
              return await Notifications.getPermissionsAsync();
            } catch (e) {
              console.warn('[DynamicOracle] Get permissions error:', e);
              return { status: 'undetermined', granted: false };
            }
          },
          scheduleNotificationAsync: async (content: any, trigger: any) => {
            try {
              // Build a valid trigger object
              let validTrigger: any = null;
              
              if (trigger === null || trigger === undefined) {
                // Immediate notification
                validTrigger = null;
              } else if (typeof trigger === 'object') {
                if (trigger.type === 'timeInterval' || trigger.seconds) {
                  validTrigger = {
                    type: 'timeInterval' as const,
                    seconds: Math.max(1, trigger.seconds || 1),
                    repeats: !!trigger.repeats,
                  };
                } else if (trigger.type === 'date' || trigger.date) {
                  validTrigger = {
                    type: 'date' as const,
                    date: trigger.date instanceof Date ? trigger.date : new Date(trigger.date || Date.now() + 1000),
                  };
                } else if (trigger.type === 'daily' || trigger.hour !== undefined) {
                  validTrigger = {
                    type: 'daily' as const,
                    hour: trigger.hour ?? 9,
                    minute: trigger.minute ?? 0,
                  };
                } else if (trigger.type === 'calendar') {
                  validTrigger = {
                    type: 'calendar' as const,
                    ...trigger,
                  };
                } else {
                  // Default to timeInterval
                  console.warn('[DynamicOracle] Unknown trigger type, defaulting to timeInterval');
                  validTrigger = { type: 'timeInterval' as const, seconds: 1, repeats: false };
                }
              } else {
                // Invalid trigger type
                console.warn('[DynamicOracle] Invalid trigger, using immediate notification');
                validTrigger = null;
              }

              return await Notifications.scheduleNotificationAsync({ content, trigger: validTrigger });
            } catch (e) {
              console.warn('[DynamicOracle] scheduleNotificationAsync failed:', e);
              // Try with null trigger (immediate)
              try {
                return await Notifications.scheduleNotificationAsync({ content, trigger: null });
              } catch (e2) {
                console.warn('[DynamicOracle] Fallback notification also failed:', e2);
                return null;
              }
            }
          },
        };

        // Shim for deprecated Permissions API that AI sometimes generates
        const Permissions = {
          askAsync: async (...types: any[]) => {
            console.warn('[DynamicOracle] Permissions.askAsync is deprecated, using Notifications.requestPermissionsAsync');
            try {
              const result = await Notifications.requestPermissionsAsync();
              return { status: result.granted ? 'granted' : 'denied', permissions: {} };
            } catch (e) {
              return { status: 'denied', permissions: {} };
            }
          },
          getAsync: async (...types: any[]) => {
            console.warn('[DynamicOracle] Permissions.getAsync is deprecated, using Notifications.getPermissionsAsync');
            try {
              const result = await Notifications.getPermissionsAsync();
              return { status: result.granted ? 'granted' : 'denied', permissions: {} };
            } catch (e) {
              return { status: 'denied', permissions: {} };
            }
          },
          NOTIFICATIONS: 'notifications',
        };

        // Provide a small shim for `useFocusEffect` often used in navigation-based code
        const useFocusEffect = (effect: any) => {
          // Best-effort: run the effect on mount and clean up on unmount
          useEffect(() => {
            const maybeCleanup = effect();
            return typeof maybeCleanup === 'function' ? maybeCleanup : undefined;
          }, []);
        };

        // Safe helper functions for common operations that often fail in AI code
        const safeLength = (arr: any) => (Array.isArray(arr) ? arr.length : 0);
        const safeArray = (arr: any) => (Array.isArray(arr) ? arr : []);
        const safeObject = (obj: any) => (obj && typeof obj === 'object' ? obj : {});
        const safeNumber = (n: any, fallback = 0) => (typeof n === 'number' && Number.isFinite(n) ? n : fallback);
        const safeString = (s: any, fallback = '') => (typeof s === 'string' ? s : fallback);
        
        // Safe JSON parse - handles already-parsed objects and invalid JSON
        const safeJSONParse = (data: any, fallback: any = null) => {
          if (data === null || data === undefined) return fallback;
          if (typeof data === 'object') return data; // Already parsed
          if (typeof data !== 'string') return fallback;
          try {
            return JSON.parse(data);
          } catch (e) {
            console.warn('[DynamicOracle] JSON parse failed:', e);
            return fallback;
          }
        };
        
        // Safe JSON stringify
        const safeJSONStringify = (data: any, fallback: string = '{}') => {
          try {
            return JSON.stringify(data);
          } catch (e) {
            console.warn('[DynamicOracle] JSON stringify failed:', e);
            return fallback;
          }
        };
        
        // Safe array method wrappers that won't throw if array is undefined/null
        const safeFilter = (arr: any, fn: (item: any, index?: number) => boolean) => {
          if (!Array.isArray(arr)) return [];
          try { return arr.filter(fn); } catch (e) { return []; }
        };
        const safeMap = (arr: any, fn: (item: any, index?: number) => any) => {
          if (!Array.isArray(arr)) return [];
          try { return arr.map(fn); } catch (e) { return []; }
        };
        const safeReduce = (arr: any, fn: (acc: any, item: any, index?: number) => any, initial: any) => {
          if (!Array.isArray(arr)) return initial;
          try { return arr.reduce(fn, initial); } catch (e) { return initial; }
        };
        const safeFind = (arr: any, fn: (item: any, index?: number) => boolean) => {
          if (!Array.isArray(arr)) return undefined;
          try { return arr.find(fn); } catch (e) { return undefined; }
        };
        const safeFindIndex = (arr: any, fn: (item: any, index?: number) => boolean) => {
          if (!Array.isArray(arr)) return -1;
          try { return arr.findIndex(fn); } catch (e) { return -1; }
        };
        const safeForEach = (arr: any, fn: (item: any, index?: number) => void) => {
          if (!Array.isArray(arr)) return;
          try { arr.forEach(fn); } catch (e) { /* ignore */ }
        };
        const safeSome = (arr: any, fn: (item: any, index?: number) => boolean) => {
          if (!Array.isArray(arr)) return false;
          try { return arr.some(fn); } catch (e) { return false; }
        };
        const safeEvery = (arr: any, fn: (item: any, index?: number) => boolean) => {
          if (!Array.isArray(arr)) return true;
          try { return arr.every(fn); } catch (e) { return true; }
        };
        const safeIncludes = (arr: any, item: any) => {
          if (!Array.isArray(arr)) return false;
          try { return arr.includes(item); } catch (e) { return false; }
        };
        const safeIndexOf = (arr: any, item: any) => {
          if (!Array.isArray(arr)) return -1;
          try { return arr.indexOf(item); } catch (e) { return -1; }
        };
        const safeSlice = (arr: any, start?: number, end?: number) => {
          if (!Array.isArray(arr)) return [];
          try { return arr.slice(start, end); } catch (e) { return []; }
        };
        const safeConcat = (arr: any, ...items: any[]) => {
          if (!Array.isArray(arr)) return items.flat();
          try { return arr.concat(...items); } catch (e) { return arr; }
        };
        const safeJoin = (arr: any, separator?: string) => {
          if (!Array.isArray(arr)) return '';
          try { return arr.join(separator); } catch (e) { return ''; }
        };
        const safeFlat = (arr: any, depth?: number) => {
          if (!Array.isArray(arr)) return [];
          try { return arr.flat(depth); } catch (e) { return arr; }
        };
        const safeFlatMap = (arr: any, fn: (item: any, index?: number) => any) => {
          if (!Array.isArray(arr)) return [];
          try { return arr.flatMap(fn); } catch (e) { return []; }
        };
        // Safe property access helper
        const safeGet = (obj: any, path: string, defaultValue: any = undefined) => {
          if (obj == null) return defaultValue;
          const keys = path.split('.');
          let result = obj;
          for (const key of keys) {
            if (result == null) return defaultValue;
            result = result[key];
          }
          return result !== undefined ? result : defaultValue;
        };

        // Custom Slider component for generated code
        const Slider = ({ value = 0, minimumValue = 0, maximumValue = 100, onValueChange, step = 1, style, minimumTrackTintColor = colors.primary, maximumTrackTintColor = colors.border, thumbTintColor = colors.primary }: any) => {
          const width = Dimensions.get('window').width - 64;
          const percentage = ((value - minimumValue) / (maximumValue - minimumValue)) * 100;
          
          return React.createElement(View, { style: [{ height: 40, justifyContent: 'center' }, style] },
            React.createElement(View, { style: { height: 4, backgroundColor: maximumTrackTintColor, borderRadius: 2, overflow: 'hidden' } },
              React.createElement(View, { style: { height: '100%', width: `${percentage}%`, backgroundColor: minimumTrackTintColor } })
            ),
            React.createElement(View, { 
              style: { 
                position: 'absolute', 
                left: `${percentage}%`, 
                marginLeft: -12,
                width: 24, 
                height: 24, 
                borderRadius: 12, 
                backgroundColor: thumbTintColor,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
              } 
            }),
            // Invisible touchable overlay for interaction
            React.createElement(TouchableOpacity, {
              style: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
              onPress: (e: any) => {
                const locationX = e.nativeEvent?.locationX || 0;
                const newValue = minimumValue + ((locationX / width) * (maximumValue - minimumValue));
                const steppedValue = Math.round(newValue / step) * step;
                const clampedValue = Math.max(minimumValue, Math.min(maximumValue, steppedValue));
                onValueChange?.(clampedValue);
              }
            })
          );
        };

        // Custom ProgressBar component
        const ProgressBar = ({ progress = 0, color = colors.primary, backgroundColor = colors.border, height = 8, style }: any) => {
          const clampedProgress = Math.max(0, Math.min(1, progress));
          return React.createElement(View, { style: [{ height, backgroundColor, borderRadius: height / 2, overflow: 'hidden' }, style] },
            React.createElement(View, { style: { height: '100%', width: `${clampedProgress * 100}%`, backgroundColor: color, borderRadius: height / 2 } })
          );
        };

        // Custom Badge component
        const Badge = ({ children, color = colors.primary, textColor = '#fff', style }: any) => {
          return React.createElement(View, { style: [{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start' }, style] },
            React.createElement(Text, { style: { color: textColor, fontSize: 12, fontWeight: '600' } }, children)
          );
        };

        // Custom Card component - with defensive rendering
        // Named OracleCard internally to avoid conflicts with AI-generated Card classes
        const OracleCard = ({ children, style, onPress }: any) => {
          try {
            const cardStyle = { backgroundColor: colors.card, borderRadius: 16, padding: 16, shadowColor: colors.shadowColor, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 };
            if (onPress) {
              return React.createElement(TouchableOpacity, { style: [cardStyle, style], onPress, activeOpacity: 0.8 }, children);
            }
            return React.createElement(View, { style: [cardStyle, style] }, children);
          } catch (e) {
            console.warn('[DynamicOracle] Card render error:', e);
            return React.createElement(View, { style: [{ backgroundColor: colors.card, borderRadius: 16, padding: 16 }, style] }, 
              React.createElement(Text, { style: { color: colors.text } }, 'Card render error')
            );
          }
        };

        // Custom StatCard component for displaying statistics
        const StatCard = ({ title, value, icon, color = colors.accent, style }: any) => {
          const IconComponent = icon;
          return React.createElement(View, { 
            style: [{ 
              backgroundColor: colors.card, 
              borderRadius: 16, 
              padding: 16, 
              shadowColor: colors.shadowColor, 
              shadowOffset: { width: 0, height: 2 }, 
              shadowOpacity: 0.08, 
              shadowRadius: 12, 
              elevation: 4,
              alignItems: 'center',
            }, style] 
          },
            IconComponent && React.createElement(View, { style: { marginBottom: 8 } },
              React.createElement(IconComponent, { size: 24, color: color })
            ),
            React.createElement(Text, { style: { fontSize: 24, fontWeight: '700', color: colors.text, marginBottom: 4 } }, value),
            React.createElement(Text, { style: { fontSize: 13, color: colors.textSecondary } }, title)
          );
        };

        // Custom Divider component
        const Divider = ({ style, color = colors.border }: any) => {
          return React.createElement(View, { style: [{ height: 1, backgroundColor: color, marginVertical: 16 }, style] });
        };

        // Custom Spacer component
        const Spacer = ({ size = 16 }: any) => {
          return React.createElement(View, { style: { height: size } });
        };

        // Custom Picker component (replacement for @react-native-picker/picker)
        const Picker = ({ selectedValue, onValueChange, children, style, itemStyle, enabled = true }: any) => {
          const [isOpen, setIsOpen] = React.useState(false);
          
          // Extract options from children (Picker.Item elements)
          const options: { label: string; value: any }[] = [];
          React.Children.forEach(children, (child: any) => {
            if (child && child.props) {
              options.push({ label: child.props.label || String(child.props.value), value: child.props.value });
            }
          });
          
          const selectedOption = options.find(o => o.value === selectedValue);
          const selectedLabel = selectedOption?.label || 'Select...';
          
          return React.createElement(View, { style: [{ minHeight: 44 }, style] },
            React.createElement(TouchableOpacity, {
              style: {
                backgroundColor: colors.inputBackground || colors.surface,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.inputBorder || colors.border,
                paddingHorizontal: 12,
                paddingVertical: 12,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                opacity: enabled ? 1 : 0.5,
              },
              onPress: () => enabled && setIsOpen(true),
              activeOpacity: 0.7,
            },
              React.createElement(Text, { 
                style: [{ 
                  color: colors.text, 
                  fontSize: 16,
                  flex: 1,
                }, itemStyle] 
              }, selectedLabel),
              React.createElement(ChevronDown, { size: 20, color: colors.textSecondary })
            ),
            React.createElement(Modal, {
              visible: isOpen,
              transparent: true,
              animationType: 'fade',
              onRequestClose: () => setIsOpen(false),
            },
              React.createElement(TouchableOpacity, {
                style: {
                  flex: 1,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  padding: 20,
                },
                activeOpacity: 1,
                onPress: () => setIsOpen(false),
              },
                React.createElement(View, {
                  style: {
                    backgroundColor: colors.card || colors.surface,
                    borderRadius: 12,
                    maxHeight: '70%',
                    width: '100%',
                    maxWidth: 400,
                    overflow: 'hidden',
                  },
                },
                  React.createElement(View, {
                    style: {
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: 16,
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  },
                    React.createElement(Text, { style: { fontSize: 18, fontWeight: '600', color: colors.text } }, 'Select Option'),
                    React.createElement(TouchableOpacity, { onPress: () => setIsOpen(false) },
                      React.createElement(X, { size: 24, color: colors.textSecondary })
                    )
                  ),
                  React.createElement(ScrollView, { style: { maxHeight: 300 } },
                    ...options.map((option, index) => 
                      React.createElement(TouchableOpacity, {
                        key: index,
                        style: {
                          padding: 16,
                          borderBottomWidth: index < options.length - 1 ? 1 : 0,
                          borderBottomColor: colors.border,
                          backgroundColor: option.value === selectedValue ? (colors.accentMuted || 'rgba(10, 255, 230, 0.1)') : 'transparent',
                        },
                        onPress: () => {
                          onValueChange?.(option.value, index);
                          setIsOpen(false);
                        },
                      },
                        React.createElement(Text, { 
                          style: { 
                            color: option.value === selectedValue ? colors.accent : colors.text,
                            fontSize: 16,
                            fontWeight: option.value === selectedValue ? '600' : '400',
                          } 
                        }, option.label)
                      )
                    )
                  )
                )
              )
            )
          );
        };
        
        // Picker.Item static component for compatibility
        (Picker as any).Item = ({ label, value }: { label: string; value: any }) => null;

        // Date/time utilities
        const formatDate = (date: Date | number | string) => {
          const d = new Date(date);
          return d.toLocaleDateString();
        };
        
        const formatTime = (date: Date | number | string) => {
          const d = new Date(date);
          return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };
        
        const formatDateTime = (date: Date | number | string) => {
          const d = new Date(date);
          return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        };

        const formatDuration = (seconds: number) => {
          const hrs = Math.floor(seconds / 3600);
          const mins = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
          if (hrs > 0) {
            return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          }
          return `${mins}:${secs.toString().padStart(2, '0')}`;
        };

        // Vibration utility (safe)
        const vibrate = (pattern?: number | number[]) => {
          try {
            Vibration?.vibrate?.(pattern);
          } catch (e) {
            // Ignore vibration errors
          }
        };

        // Haptic feedback utilities (safe)
        const hapticFeedback = {
          light: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {} },
          medium: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {} },
          heavy: () => { try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {} },
          success: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} },
          warning: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); } catch (e) {} },
          error: () => { try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); } catch (e) {} },
          selection: () => { try { Haptics.selectionAsync(); } catch (e) {} },
        };

        // Clipboard utilities
        const clipboard = {
          copy: async (text: string) => { try { await Clipboard.setStringAsync(text); return true; } catch (e) { return false; } },
          paste: async () => { try { return await Clipboard.getStringAsync(); } catch (e) { return ''; } },
        };

        // URL/Link utilities
        const openURL = async (url: string) => {
          try {
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            return supported;
          } catch (e) {
            console.warn('[DynamicOracle] Failed to open URL:', e);
            return false;
          }
        };

        // Safe Keyboard wrapper that handles missing methods gracefully
        const SafeKeyboard = {
          addListener: (eventName: string, callback: (e: any) => void) => {
            if (RNKeyboard && typeof RNKeyboard.addListener === 'function') {
              return RNKeyboard.addListener(eventName, callback);
            }
            // Return a no-op subscription if Keyboard.addListener is unavailable
            console.warn('[SafeKeyboard] Keyboard.addListener not available, returning no-op');
            return { remove: () => {} };
          },
          dismiss: () => {
            if (RNKeyboard && typeof RNKeyboard.dismiss === 'function') {
              RNKeyboard.dismiss();
            }
          },
          isVisible: () => {
            if (RNKeyboard && typeof RNKeyboard.isVisible === 'function') {
              return RNKeyboard.isVisible();
            }
            return false;
          },
          metrics: () => {
            if (RNKeyboard && typeof RNKeyboard.metrics === 'function') {
              return RNKeyboard.metrics();
            }
            return null;
          },
          scheduleLayoutAnimation: (event: any) => {
            if (RNKeyboard && typeof RNKeyboard.scheduleLayoutAnimation === 'function') {
              RNKeyboard.scheduleLayoutAnimation(event);
            }
          },
        };

        // Math utilities
        const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
        const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
        const randomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
        const randomFloat = (min: number, max: number) => Math.random() * (max - min) + min;
        const roundTo = (value: number, decimals: number) => Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);

        // Create execution context with all available dependencies
        const context = {
          // React
          React,
          useState,
          useEffect,
          useMemo,
          useCallback,
          useRef,
          // Safe helper functions for common operations
          safeLength,
          safeArray,
          safeObject,
          safeNumber,
          safeString,
          safeFilter,
          safeMap,
          safeReduce,
          safeFind,
          safeFindIndex,
          safeForEach,
          safeSome,
          safeEvery,
          safeIncludes,
          safeIndexOf,
          safeSlice,
          safeConcat,
          safeJoin,
          safeFlat,
          safeFlatMap,
          safeGet,
          safeJSONParse,
          safeJSONStringify,
          // Override JSON with safe versions to prevent "Unexpected character: o" errors
          JSON: {
            parse: safeJSONParse,
            stringify: safeJSONStringify,
          },
          // React Native
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
          // Wrapped FlatList that safely handles data prop
          FlatList: (props: any) => {
            const safeData = Array.isArray(props.data) ? props.data : [];
            return React.createElement(FlatList, { ...props, data: safeData });
          },
          // Wrapped SectionList that safely handles sections prop
          SectionList: (props: any) => {
            const safeSections = Array.isArray(props.sections) ? props.sections : [];
            return React.createElement(SectionList, { ...props, sections: safeSections });
          },
          Switch,
          Modal,
          Animated,
          Easing,
          ActivityIndicator,
          AppState,
          Keyboard: SafeKeyboard, // Safe wrapper for React Native Keyboard module
          KeyboardIcon, // Lucide keyboard icon (use this for icons, not Keyboard)
          AccessibilityInfo,
          // Custom UI Components for richer apps
          Slider,
          ProgressBar,
          Badge,
          Card: OracleCard,
          OracleCard,
          StatCard,
          Divider,
          Spacer,
          Picker,
          // Date/Time utilities
          formatDate,
          formatTime,
          formatDateTime,
          formatDuration,
          // Haptics
          vibrate,
          // Storage & Notifications
          AsyncStorage,
          // localStorage shim that maps to AsyncStorage (AI sometimes uses web APIs)
          localStorage: {
            getItem: (key: string) => {
              // Synchronous shim - return null, use AsyncStorage for real storage
              console.warn('[DynamicOracle] localStorage.getItem called - use AsyncStorage instead. Key:', key);
              return null;
            },
            setItem: (key: string, value: string) => {
              console.warn('[DynamicOracle] localStorage.setItem called - use AsyncStorage instead. Key:', key);
              // Also save to AsyncStorage async
              AsyncStorage.setItem(key, value).catch(e => {});
            },
            removeItem: (key: string) => {
              console.warn('[DynamicOracle] localStorage.removeItem called - use AsyncStorage instead. Key:', key);
              AsyncStorage.removeItem(key).catch(e => {});
            },
            clear: () => {
              console.warn('[DynamicOracle] localStorage.clear called - not supported');
            },
          },
          Notifications: wrappedNotifications,
          // Deprecated Permissions API shim
          Permissions,
          // Navigation helpers shims
          useFocusEffect,
          // Minimal `useRouter` shim so generated code that calls router hooks doesn't crash.
          useRouter: () => ({
            push: (...args: any[]) => console.warn('[DynamicOracle.useRouter] push called', args),
            replace: (...args: any[]) => console.warn('[DynamicOracle.useRouter] replace called', args),
            back: () => console.warn('[DynamicOracle.useRouter] back called'),
            canGoBack: () => false,
            prefetch: async () => {},
            query: {},
          }),
          // Charts
          LineChart,
          BarChart,
          PieChart,
          // Theme
          colors,
          // RN components often used by generated code
          SafeAreaView,
          KeyboardAvoidingView,
          Pressable,
          StatusBar,
          Image: RNImage,
          Button,
          Vibration,
          Linking,
          // Haptics & Feedback
          Haptics,
          hapticFeedback,
          vibrate,
          // Clipboard
          Clipboard,
          clipboard,
          // URL
          openURL,
          // Math utilities
          clamp,
          lerp,
          randomInt,
          randomFloat,
          roundTo,
          Math, // Expose built-in Math
          // Firebase (provide both Realtime DB helpers and exported config/db)
          initializeApp,
          getDatabase,
          ref,
          set,
          push,
          onValue,
          get,
          remove,
          update,
          firebaseConfig: firebaseConfigDefault,
          firestoreDb,
          // Pre-initialized database instance for AI code that uses `database` directly
          database: firebaseDatabase,
          db: firebaseDatabase,
          // Cleanup registration API for generated code
          __registerCleanup: (fn: () => void) => {
            try {
              if (typeof fn === 'function') cleanupRegistry.current.push(fn);
            } catch (e) {
              console.warn('[DynamicOracle] Failed to register cleanup', e);
            }
          },
          // Navigation: Allow generated code to exit back to home
          goHome: onGoHome || (() => console.warn('[DynamicOracle] goHome called but no handler provided')),
          exitOracle: onGoHome || (() => console.warn('[DynamicOracle] exitOracle called but no handler provided')),
          // Lucide Icons - Core
          Check, Plus, Minus, Trash2, RefreshCw, Share2, ShoppingCart, Droplet, Flame,
          TrendingUp, TrendingDown, Clock, Zap, Heart, Star, Calendar, Target, Award,
          Bell, Activity, DollarSign, BarChart3, Coffee, Moon, Sun, Edit2, Save, X, History,
          ChevronRight, ChevronDown, ChevronUp, ChevronLeft, Search, Filter, Settings, User, Home, MapPin,
          Phone, Mail, Camera, Image, Play, Pause, Square, Circle, Triangle,
          ArrowUp, ArrowDown, ArrowLeft, ArrowRight, RotateCcw, Volume2, VolumeX,
          Wifi, Battery, Bluetooth, Lock, Unlock, Eye, EyeOff, Copy, Clipboard: ClipboardIcon,
          Download, Upload, Link, ExternalLink, Bookmark, Tag, Hash, AtSign,
          MessageCircle, Send, Paperclip, File, Folder, Archive, Package, Gift,
          CreditCard, Wallet, PiggyBank, Receipt, Calculator, Percent, Timer,
          Album, Hourglass, Watch, Sunrise, Sunset, Cloud, CloudRain, Snowflake,
          Wind, Thermometer, Umbrella, Briefcase, Building, Store, Truck, Car,
          Bike, Plane, Train, Ship, Anchor, Flag, Compass, Navigation, Globe,
          Mountain, Flower, Leaf, Apple, Pizza, Utensils, Wine, Beer, Cake,
          Pill, Stethoscope, Syringe, Bandage, Dumbbell, Trophy, Medal,
          Crown, Gem, Sparkles, Wand2, Lightbulb, Rocket, Puzzle, Gamepad, Dice5,
          Music, Headphones, Mic, Video, Tv, Monitor, Smartphone, Tablet, Laptop,
          Keyboard: KeyboardIcon, Mouse, Printer, Server, Database, HardDrive, Cpu, Code, Terminal,
          Bug, Shield, Key, Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
          ListTodo, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
          MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
          // Lucide Icons - Extended (added)
          Repeat, SkipForward, SkipBack, FastForward, Rewind, StopCircle, PlayCircle, PauseCircle,
          CircleDot, Crosshair, Sliders, Move, ZoomIn, ZoomOut, RotateCw, Undo, Redo,
          Trash, Edit, EditIcon, PlusCircle, MinusCircle, XCircle, CheckCircle,
          AlertTriangle, BellRing, BellOff, CalendarCheck, CalendarX, ListChecks, ListOrdered,
          SortAsc, SortDesc, Shuffle, ArrowUpDown, LogOut, LogIn, Power, RefreshCcw,
          // Lucide Icons - Additional commonly used
          Book, BookOpen, Pencil, PenTool, Type, AlignLeft, AlignCenter, AlignRight, AlignJustify,
          Bold, Italic, Underline, List, FileText, FilePlus, FileEdit, FolderOpen, FolderPlus,
          Users, UserPlus, UserMinus, UserCheck, UserX, MessageSquare, MessagesSquare,
          ThumbsUp, ThumbsDown, Smile, Frown, Meh, AlertOctagon, Ban, XOctagon,
          Voicemail, PhoneCall, PhoneOff, PhoneIncoming, PhoneOutgoing, PhoneMissed,
          WifiIcon, WifiOff, Signal, Radio, Rss, Cast, Airplay,
          BatteryIcon, BatteryCharging, BatteryFull, BatteryLow, BatteryMedium, BatteryWarning,
          SunIcon, MoonIcon, CloudSun, Stars, Cloudy,
          Dribbble, Github, Twitter, Facebook, Instagram, Linkedin, Youtube,
          Globe2, Map: MapIcon, MapPinned, Route, Signpost, Milestone,
          ShoppingBag, Barcode, ScanLine, Tags, Coins, Banknote,
          GraduationCap, School, Library, Pen, Eraser, Highlighter, Ruler,
          Wrench, Hammer, Screwdriver, Construction, HardHat, Cog, Cogs,
          FlameIcon, Droplets, Waves, SnowflakeIcon, Rainbow, Tornado,
          Baby, Dog, Cat, Bird, Fish, BugIcon, Rat, Rabbit,
          Footprints, Accessibility, Ear, Hand, Bone, Brain, EyeIcon,
          Bed, Sofa, Lamp, DoorOpen, DoorClosed, Window, Fence,
          Tent, Caravan, Trees, PalmTree, TreeDeciduous, TreePine, Cactus,
          Grape, Cherry, Banana, Citrus, Carrot, Salad, Egg, Croissant,
          IceCream, Cookie, Candy, Popcorn, Soup, Drumstick, Sandwich,
          Cigarette, WineIcon, Martini, GlassWater, Cup, Milk,
          Shirt, WatchIcon, Glasses, Hat, Ribbon, Scissors, Brush,
          Palette, Paintbrush, PaintBucket, Pipette, Shapes, Pentagon, Octagon,
          Disc, DiscAlbum, RadioIcon,
          // Icon aliases for common AI naming variations
          ShareIcon: Share,
          ShareAlt: Share,
          Share2Icon: Share2,
          HeartIcon: Heart,
          HeartFill: Heart,
          HeartFilled: Heart,
          StarIcon: Star,
          StarFill: Star,
          StarFilled: Star,
          BellIcon: Bell,
          SettingsIcon: Settings,
          GearIcon: Settings,
          HomeIcon: Home,
          SearchIcon: Search,
          CloseIcon: X,
          CloseCircle: XCircle,
          AddIcon: Plus,
          AddCircle: PlusCircle,
          RemoveIcon: Minus,
          DeleteIcon: Trash,
          TrashIcon: Trash2,
          EditPencil: Edit,
          PencilIcon: Pencil,
          CopyIcon: Copy,
          SendIcon: Send,
          MailIcon: Mail,
          EmailIcon: Mail,
          PhoneIcon: Phone,
          CameraIcon: Camera,
          ImageIcon: Image,
          PhotoIcon: Image,
          PlayIcon: Play,
          PauseIcon: Pause,
          StopIcon: StopCircle,
          ForwardIcon: FastForward,
          BackIcon: Rewind,
          VolumeIcon: Volume2,
          MuteIcon: VolumeX,
          LockIcon: Lock,
          UnlockIcon: Unlock,
          EyeIcon: Eye,
          EyeOffIcon: EyeOff,
          LocationIcon: MapPin,
          PinIcon: MapPin,
          TimeIcon: Clock,
          ClockIcon: Clock,
          CalendarIcon: Calendar,
          ChartIcon: BarChart3,
          GraphIcon: BarChart3,
          FileIcon: File,
          FolderIcon: Folder,
          DownloadIcon: Download,
          UploadIcon: Upload,
          RefreshIcon: RefreshCw,
          ReloadIcon: RefreshCw,
          WarningIcon: AlertTriangle,
          ErrorIcon: XCircle,
          SuccessIcon: CheckCircle,
          InfoIcon: Info,
          QuestionIcon: HelpCircle,
          MenuIcon: Menu,
          MoreIcon: MoreVertical,
          DotsIcon: MoreHorizontal,
          FilterIcon: Filter,
          SortIcon: ArrowUpDown,
          ZoomInIcon: ZoomIn,
          ZoomOutIcon: ZoomOut,
          ExpandIcon: Maximize,
          CollapseIcon: Minimize,
          FullscreenIcon: Maximize,
          ExitFullscreenIcon: Minimize,
          // Module system
          exports: moduleExports,
          module: { exports: moduleExports },
        };

        // Execute code in sandbox - wrapping to capture default export
        const contextKeys = Object.keys(context);
        const contextValues = Object.values(context);
        
        // Wrap transpiled code to ensure we capture the export
        const wrappedCode = `
          ${transpiled}
          
          // Return the default export
          return exports.default || module.exports.default || module.exports;
        `;
        
        const executor = new Function(...contextKeys, wrappedCode);
        const e0 = Date.now();
        const OracleComponent = executor(...contextValues);
        const e1 = Date.now();
        globalMetrics.execTime += e1 - e0;

        if (!OracleComponent) {
          throw new Error('Component not exported');
        }

        // Cache the created component in GLOBAL cache
        globalComponentCache.set(codeHash, OracleComponent);

        // Log metrics (avg transform/exec)
        try {
          const m = globalMetrics;
          const avgTransform = m.transforms ? Math.round(m.transformTime / m.transforms) : 0;
          const avgExec = m.transforms ? Math.round(m.execTime / m.transforms) : 0;
          console.log(`[DynamicOracle] metrics hits=${m.cacheHits} misses=${m.cacheMisses} transpileHits=${m.transpileCacheHits} transforms=${m.transforms} avgTransform=${avgTransform}ms avgExec=${avgExec}ms`);
        } catch (e) {}

        if (!mounted || generationRef.current !== gen) return;

        console.log('[DynamicOracle] ✓ Component created successfully');
        setComponent(() => OracleComponent);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[DynamicOracle] Error:', err);
        
        // Extract line number from error message if present
        const lineMatch = err.message?.match(/(\d+):(\d+)/);
        if (lineMatch && transpiled) {
          const lineNum = parseInt(lineMatch[1], 10);
          const colNum = parseInt(lineMatch[2], 10);
          const lines = transpiled.split('\n');
          if (lineNum > 0 && lineNum <= lines.length) {
            const errorLine = lines[lineNum - 1];
            const contextStart = Math.max(0, lineNum - 3);
            const contextEnd = Math.min(lines.length, lineNum + 2);
            const contextLines = lines.slice(contextStart, contextEnd).map((l, i) => {
              const num = contextStart + i + 1;
              const marker = num === lineNum ? '>>> ' : '    ';
              return `${marker}${num}: ${l}`;
            }).join('\n');
            console.error(`[DynamicOracle] Error at line ${lineNum}, col ${colNum}:`);
            console.error(`[DynamicOracle] Problematic line: ${errorLine}`);
            console.error(`[DynamicOracle] Context:\n${contextLines}`);
          }
        }
        
        const errorMessage = err.message || 'Failed to render oracle';
        if (mounted) {
          setError(errorMessage);
          setIsLoading(false);
        }
        onError?.(err);
      }
    })();

    return () => {
      // mark unmounted and run cleanup functions registered by generated code
      mounted = false;
      generationRef.current += 1; // invalidate any in-flight work
      try {
        const fns = cleanupRegistry.current.splice(0, cleanupRegistry.current.length);
        fns.forEach((fn) => {
          try { fn(); } catch (e) { console.warn('[DynamicOracle] cleanup failed', e); }
        });
      } catch (e) {
        console.warn('[DynamicOracle] failed to run cleanup registry', e);
      }
    };
  }, [code, codeHash, onError]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>Loading Oracle...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.error}>
        <AlertCircle size={32} color={colors.error} />
        <Text style={styles.errorTitle}>Failed to Load Oracle</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (!Component) {
    return (
      <View style={styles.error}>
        <AlertCircle size={32} color={colors.error} />
        <Text style={styles.errorTitle}>No Component</Text>
      </View>
    );
  }

  // Wrap component in error boundary to catch runtime errors
  return (
    <OracleErrorBoundary onError={onError}>
      <Component />
    </OracleErrorBoundary>
  );
}

// Error boundary to catch runtime errors in generated components
class OracleErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[OracleErrorBoundary] Runtime error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorBoundaryStyles.container}>
          <AlertCircle size={32} color={colors.error} />
          <Text style={errorBoundaryStyles.title}>Oracle Runtime Error</Text>
          <Text style={errorBoundaryStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </Text>
          <Text style={errorBoundaryStyles.hint}>
            This is often caused by the AI-generated code accessing data before it's loaded.
            Try regenerating the Oracle or refining the prompt.
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  message: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  hint: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    fontStyle: 'italic',
    paddingHorizontal: 20,
  },
});

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: colors.textSecondary,
  },
  error: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.error,
    marginTop: 16,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
