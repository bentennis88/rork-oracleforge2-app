import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Babel from '@babel/standalone';
import { transpileAsync } from './transpiler';
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
  Switch,
  Modal,
  Animated,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Pressable,
  StatusBar,
  Image as RNImage,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { initializeApp as firebaseInitializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, set, push, onValue, get, remove, update } from 'firebase/database';
import firebaseConfigDefault, { db as firestoreDb, database as firebaseDatabase, app as firebaseApp } from '@/config/firebase';
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
  Bike, Plane, Train, Ship, Anchor, Flag, Compass, Navigation, Globe,
  Mountain, Flower, Leaf, Apple, Pizza, Utensils, Wine, Beer, Cake,
  Pill, Stethoscope, Syringe, Bandage, Dumbbell, Trophy, Medal,
  Crown, Gem, Sparkles, Wand2, Lightbulb, Rocket, Puzzle, Gamepad, Dice5,
  Music, Headphones, Mic, Video, Tv, Monitor, Smartphone, Tablet, Laptop,
  Keyboard, Mouse, Printer, Server, Database, HardDrive, Cpu, Code, Terminal,
  Bug, Shield, Key, Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
  ListTodo, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
  MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
} from 'lucide-react-native';
import { BarChart, PieChart, LineChart } from 'react-native-chart-kit';
import colors from '@/constants/colors';

// Simple in-memory LRU cache for compiled components
class LRUCache<K, V> {
  size: number;
  map: Map<K, V>;
  constructor(size = 10) {
    this.size = size;
    this.map = new Map();
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
}

export default function DynamicOracleRenderer({ code, onError }: DynamicOracleRendererProps) {
  const [Component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Cache transpiled / created components by source code to avoid repeated heavy transforms
  const defaultCacheSize = parseInt(String(process.env.EXPO_PUBLIC_ORACLE_CACHE_SIZE || '10'), 10) || 10;
  const transpileCache = useRef<LRUCache<string, any>>(new LRUCache(defaultCacheSize));
  // Metrics for transforms and execution
  const metricsRef = useRef({ cacheHits: 0, cacheMisses: 0, transforms: 0, transformTime: 0, execTime: 0 });
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
      // Remove trailing . or ?. before ), ], }, ;, , or newline
      s = s.replace(/\.(\s*[)\]};,\n])/g, '$1');
      s = s.replace(/\?\.\s*(?=[)\]};,\n])/g, '');
      
      // Fix `obj. ` (dot followed by space then non-identifier) - remove the dot
      s = s.replace(/(\w+)\.(\s+[^a-zA-Z_$])/g, '$1$2');
      s = s.replace(/(\w+)\?\.\s+([^a-zA-Z_$])/g, '$1$2');

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
                issues.push(`Nested virtualized list detected: <${name}> inside <${aName}> (may break virtualization).`);
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

    (async () => {
      try {
        console.log('[DynamicOracle] Transpiling code...');
        setIsLoading(true);
        setError(null);
        // Fast path: if we've already created a component for the same source, reuse it
        const cached = transpileCache.current.get(code);
        if (cached) {
          metricsRef.current.cacheHits += 1;
          if (!mounted || generationRef.current !== gen) return;
          setComponent(() => cached);
          setIsLoading(false);
          console.log('[DynamicOracle] cache hit; metrics:', metricsRef.current);
          return;
        }
        metricsRef.current.cacheMisses += 1;

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
        const t0 = Date.now();
        const transpileOptions = {
          filename: 'OracleComponent.tsx',
          sourceType: 'module',
          presets: [
            ['env', { modules: 'commonjs' }],
            'react',
            'typescript',
          ],
          plugins: [
            'proposal-class-properties',
            'proposal-object-rest-spread',
          ],
        } as any;

        let transpiled = await transpileAsync(sanitized, transpileOptions);
        const t1 = Date.now();
        metricsRef.current.transforms += 1;
        metricsRef.current.transformTime += t1 - t0;

        if (!transpiled) {
          throw new Error('Transpilation returned empty code');
        }

        // Post-process transpiled code to protect common array operations
        // Replace `varname.filter(` with `(Array.isArray(varname) ? varname : []).filter(`
        // This prevents "filter is not a function" errors
        transpiled = transpiled.replace(
          /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\.\s*(filter|map|reduce|find|forEach|some|every|includes)\s*\(/g,
          '(Array.isArray($1) ? $1 : []).$2('
        );
        
        // Protect .length access on potential non-arrays
        transpiled = transpiled.replace(
          /(\b[a-zA-Z_$][a-zA-Z0-9_$]*)\s*\.\s*length\b(?!\s*[=(])/g,
          '(Array.isArray($1) ? $1.length : (typeof $1 === "string" ? $1.length : 0))'
        );

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
          FlatList,
          Switch,
          Modal,
          Animated,
          ActivityIndicator,
          // Storage & Notifications
          AsyncStorage,
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
          // Lucide Icons
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
          Bike, Plane, Train, Ship, Anchor, Flag, Compass, Navigation, Globe,
          Mountain, Flower, Leaf, Apple, Pizza, Utensils, Wine, Beer, Cake,
          Pill, Stethoscope, Syringe, Bandage, Dumbbell, Trophy, Medal,
          Crown, Gem, Sparkles, Wand2, Lightbulb, Rocket, Puzzle, Gamepad, Dice5,
          Music, Headphones, Mic, Video, Tv, Monitor, Smartphone, Tablet, Laptop,
          Keyboard, Mouse, Printer, Server, Database, HardDrive, Cpu, Code, Terminal,
          Bug, Shield, Key, Fingerprint, Scan, QrCode, AlertCircle, Info, HelpCircle,
          ListTodo, Grid, Layers, Layout, Box, Hexagon, Maximize, Minimize,
          MoreHorizontal, MoreVertical, Menu, SlidersHorizontal, ToggleLeft, ToggleRight,
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
        metricsRef.current.execTime += e1 - e0;

        if (!OracleComponent) {
          throw new Error('Component not exported');
        }

        // Cache the created component to speed up future renders
        transpileCache.current.set(code, OracleComponent);

        // Log metrics (avg transform/exec)
        try {
          const m = metricsRef.current;
          const avgTransform = m.transforms ? Math.round(m.transformTime / m.transforms) : 0;
          const avgExec = m.transforms ? Math.round(m.execTime / m.transforms) : 0;
          console.log(`[DynamicOracle] metrics cacheHits=${m.cacheHits} cacheMisses=${m.cacheMisses} transforms=${m.transforms} avgTransform=${avgTransform}ms avgExec=${avgExec}ms`);
        } catch (e) {}

        if (!mounted || generationRef.current !== gen) return;

        console.log('[DynamicOracle] ✓ Component created successfully');
        setComponent(() => OracleComponent);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[DynamicOracle] Error:', err);
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
  }, [code, onError]);

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
