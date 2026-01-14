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

  const cleanCode = (code: string) => {
    let cleaned = code
      .replace(/```(?:js|jsx)?\n?/, '')
      .replace(/```$/, '') // Remove backticks
      .replace(/^\s*import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/, '') // Remove duplicate React import
      .replace(/console\.log/g, '// console.log') // Disable logs
      .replace(/alert/g, '// alert') // Disable alerts
      .replace(/backgroundColor:\s*'?#?([0-9a-fA-F]+?)(?=[^0-9a-fA-F])/, (match, hex) => `backgroundColor: '#${hex}'`) // Fix unterminated colors
      .replace(/<View([^>]*)(?<!\/)>/g, '<View$1 />') // Close self-closing tags
      .replace(/<Text([^>]*)(?<!\/)>/g, '<Text$1 />')
      .replace(/([^;}])\s*$/gm, '$1;') // Add missing semicolons
      .replace(/\{([^}]*)\s*$/gm, '{$1}') // Balance braces
      .trim();
    return cleaned;
  };

  useEffect(() => {
    (async () => {
      try {
        console.log('[DynamicOracle] Transpiling code...');
        setIsLoading(true);
        setError(null);

        // Clean and transpile with Babel (NO CommonJS transform)
        const sanitized = cleanCode(code);
        const transpiled = Babel.transform(sanitized, {
          filename: 'OracleComponent.tsx',
          sourceType: 'module',
          presets: [
            ['env', { modules: false }],
            'react',
            'typescript',
          ],
          plugins: [
            'proposal-class-properties',
            'proposal-object-rest-spread',
          ],
        }).code;

        if (!transpiled) {
          throw new Error('Transpilation returned empty code');
        }

        console.log('[DynamicOracle] Creating component...');

        // Create a module-like exports object
        const moduleExports: any = { default: null };

        // Create execution context with all available dependencies
        const context = {
          // React
          React,
          useState,
          useEffect,
          useMemo,
          useCallback,
          useRef,
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
          Notifications,
          // Charts
          LineChart,
          BarChart,
          PieChart,
          // Theme
          colors,
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
        const OracleComponent = executor(...contextValues);

        if (!OracleComponent) {
          throw new Error('Component not exported');
        }

        console.log('[DynamicOracle] ✓ Component created successfully');
        setComponent(() => OracleComponent);
        setIsLoading(false);
      } catch (err: any) {
        console.error('[DynamicOracle] Error:', err);
        const errorMessage = err.message || 'Failed to render oracle';
        setError(errorMessage);
        setIsLoading(false);
        onError?.(err);
      }
    })();
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

  return <Component />;
}

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
