/**
 * LocalModelFallback - Zero external dependencies via local model inference
 * Auto-optimizes to local models (Gemma, Llama) for offline operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ModelConfig {
  name: string;
  type: 'remote' | 'local' | 'cached';
  endpoint?: string;
  apiKey?: string;
  maxTokens: number;
  temperature: number;
  costPerToken?: number;
  latencyMs?: number;
  offlineCapable: boolean;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  model: string;
  latencyMs: number;
  tokensUsed: number;
  cost: number;
  fromCache: boolean;
  offline: boolean;
  error?: string;
}

export interface CachedResponse {
  input: string;
  inputHash: string;
  output: string;
  model: string;
  timestamp: number;
  usageCount: number;
}

export interface CostOptimizationResult {
  recommendedModel: string;
  estimatedCost: number;
  estimatedLatency: number;
  reasoning: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_KEY = '@oracle_forge_inference_cache_v9'; // v9: lowered quality threshold for AI-generated code
const MAX_CACHE_SIZE = 500;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const XAI_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  process.env.EXPO_PUBLIC_XAI_API_KEY;

// ============================================================================
// MODEL CONFIGURATIONS
// ============================================================================

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'grok-3-fast': {
    name: 'grok-3-fast',
    type: 'remote',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    apiKey: XAI_API_KEY,
    maxTokens: 16384,
    temperature: 0.7,
    costPerToken: 0.00001,
    latencyMs: 2000,
    offlineCapable: false,
  },
  'grok-3-mini': {
    name: 'grok-3-mini',
    type: 'remote',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    apiKey: XAI_API_KEY,
    maxTokens: 8192,
    temperature: 0.7,
    costPerToken: 0.000005,
    latencyMs: 1000,
    offlineCapable: false,
  },
  'local-template': {
    name: 'local-template',
    type: 'local',
    maxTokens: 4096,
    temperature: 0,
    costPerToken: 0,
    latencyMs: 50,
    offlineCapable: true,
  },
  'cached': {
    name: 'cached',
    type: 'cached',
    maxTokens: 16384,
    temperature: 0,
    costPerToken: 0,
    latencyMs: 10,
    offlineCapable: true,
  },
};

// ============================================================================
// LOCAL TEMPLATE ENGINE (Deterministic, Zero Cost)
// ============================================================================

class LocalTemplateEngine {
  private templates: Map<string, string> = new Map();
  private patterns: Map<string, RegExp> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Water Tracker Template
    this.templates.set('water_tracker', `
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Droplets, Plus, Minus, Target, TrendingUp } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WaterTracker() {
  const [intake, setIntake] = useState(0);
  const [goal, setGoal] = useState({{GOAL}});
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const saved = await AsyncStorage.getItem('@water_data');
      if (saved) {
        const data = JSON.parse(saved);
        setIntake(data.intake || 0);
        setHistory(data.history || []);
      }
    } catch (e) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const saveData = async (newIntake, newHistory) => {
    try {
      await AsyncStorage.setItem('@water_data', JSON.stringify({
        intake: newIntake,
        history: newHistory,
        lastUpdated: Date.now()
      }));
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const addWater = (amount) => {
    const newIntake = intake + amount;
    const newHistory = [...history, { amount, time: Date.now() }];
    setIntake(newIntake);
    setHistory(newHistory);
    saveData(newIntake, newHistory);
  };

  const progress = Math.min((intake / goal) * 100, 100);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Droplets size={48} color="#2196F3" />
        <Text style={styles.title}>Water Tracker</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progress + '%' }]} />
        </View>
        <Text style={styles.progressText}>{intake} / {goal} {{UNIT}}</Text>
      </View>

      <View style={styles.buttonsContainer}>
        {{BUTTONS}}
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { alignItems: 'center', marginVertical: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 8 },
  progressContainer: { alignItems: 'center', marginVertical: 24 },
  progressBar: { width: '100%', height: 24, backgroundColor: '#E0E0E0', borderRadius: 12, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#2196F3', borderRadius: 12 },
  progressText: { marginTop: 8, fontSize: 18, color: '#333' },
  buttonsContainer: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  button: { backgroundColor: '#2196F3', paddingVertical: 16, paddingHorizontal: 24, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  loadingText: { fontSize: 18, color: '#666', textAlign: 'center', marginTop: 100 },
  errorText: { color: '#F44336', textAlign: 'center', marginTop: 16 },
});
`);

    // Habit Tracker Template
    this.templates.set('habit_tracker', `
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { CheckCircle, Circle, Plus, Trash2, Calendar } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [newHabit, setNewHabit] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHabits();
  }, []);

  const loadHabits = async () => {
    try {
      const saved = await AsyncStorage.getItem('@habits_data');
      if (saved) setHabits(JSON.parse(saved));
    } catch (e) {
      console.error('Load failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveHabits = async (newHabits) => {
    try {
      await AsyncStorage.setItem('@habits_data', JSON.stringify(newHabits));
    } catch (e) {
      console.error('Save failed:', e);
    }
  };

  const addHabit = () => {
    if (!newHabit.trim()) return;
    const habit = {
      id: Date.now().toString(),
      name: newHabit.trim(),
      completedDates: [],
      streak: 0,
      createdAt: Date.now()
    };
    const updated = [...habits, habit];
    setHabits(updated);
    setNewHabit('');
    saveHabits(updated);
  };

  const toggleHabit = (habitId) => {
    const today = new Date().toDateString();
    const updated = habits.map(h => {
      if (h.id !== habitId) return h;
      const completed = h.completedDates.includes(today);
      return {
        ...h,
        completedDates: completed 
          ? h.completedDates.filter(d => d !== today)
          : [...h.completedDates, today],
        streak: completed ? Math.max(0, h.streak - 1) : h.streak + 1
      };
    });
    setHabits(updated);
    saveHabits(updated);
  };

  const deleteHabit = (habitId) => {
    const updated = habits.filter(h => h.id !== habitId);
    setHabits(updated);
    saveHabits(updated);
  };

  const isCompletedToday = (habit) => {
    return habit.completedDates.includes(new Date().toDateString());
  };

  if (loading) {
    return <View style={styles.container}><Text>Loading...</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>{{TITLE}}</Text>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newHabit}
          onChangeText={setNewHabit}
          placeholder="Add new habit..."
          placeholderTextColor="#999"
        />
        <TouchableOpacity style={styles.addButton} onPress={addHabit}>
          <Plus size={24} color="#FFF" />
        </TouchableOpacity>
      </View>

      {habits.map(habit => (
        <TouchableOpacity 
          key={habit.id} 
          style={styles.habitItem}
          onPress={() => toggleHabit(habit.id)}
        >
          {isCompletedToday(habit) ? (
            <CheckCircle size={28} color="#4CAF50" />
          ) : (
            <Circle size={28} color="#CCC" />
          )}
          <View style={styles.habitInfo}>
            <Text style={[styles.habitName, isCompletedToday(habit) && styles.completed]}>
              {habit.name}
            </Text>
            <Text style={styles.streak}>🔥 {habit.streak} day streak</Text>
          </View>
          <TouchableOpacity onPress={() => deleteHabit(habit.id)}>
            <Trash2 size={20} color="#F44336" />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', marginBottom: 24 },
  inputContainer: { flexDirection: 'row', marginBottom: 24 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, fontSize: 16, marginRight: 12 },
  addButton: { backgroundColor: '#4CAF50', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  habitItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  habitInfo: { flex: 1, marginLeft: 16 },
  habitName: { fontSize: 18, color: '#333' },
  completed: { textDecorationLine: 'line-through', color: '#999' },
  streak: { fontSize: 14, color: '#FF9800', marginTop: 4 },
});
`);

    // Counter/Tracker Template
    this.templates.set('counter', `
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus, RotateCcw } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Counter() {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCount();
  }, []);

  const loadCount = async () => {
    try {
      const saved = await AsyncStorage.getItem('@counter_{{ID}}');
      if (saved) setCount(parseInt(saved, 10) || 0);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  const saveCount = async (value) => {
    try {
      await AsyncStorage.setItem('@counter_{{ID}}', value.toString());
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const increment = () => {
    const newCount = count + {{STEP}};
    setCount(newCount);
    saveCount(newCount);
  };

  const decrement = () => {
    const newCount = Math.max(0, count - {{STEP}});
    setCount(newCount);
    saveCount(newCount);
  };

  const reset = () => {
    setCount(0);
    saveCount(0);
  };

  if (loading) return <View style={styles.container}><Text>Loading...</Text></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{{TITLE}}</Text>
      <Text style={styles.count}>{count}</Text>
      <Text style={styles.unit}>{{UNIT}}</Text>
      
      <View style={styles.buttons}>
        <TouchableOpacity style={[styles.button, styles.decrement]} onPress={decrement}>
          <Minus size={32} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.reset]} onPress={reset}>
          <RotateCcw size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.increment]} onPress={increment}>
          <Plus size={32} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 32 },
  count: { fontSize: 96, fontWeight: 'bold', color: '#26A69A' },
  unit: { fontSize: 18, color: '#666', marginTop: 8, marginBottom: 48 },
  buttons: { flexDirection: 'row', gap: 24 },
  button: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  increment: { backgroundColor: '#4CAF50' },
  decrement: { backgroundColor: '#F44336' },
  reset: { backgroundColor: '#9E9E9E', width: 56, height: 56, borderRadius: 28 },
});
`);

    // Timer Template
    this.templates.set('timer', `
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { Play, Pause, RotateCcw, Bell } from 'lucide-react-native';

export default function Timer() {
  const [seconds, setSeconds] = useState({{DURATION}});
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (isRunning && seconds > 0) {
      intervalRef.current = setInterval(() => {
        setSeconds(s => {
          if (s <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            Vibration.vibrate([0, 500, 200, 500]);
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const formatTime = (s) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  const toggle = () => {
    setIsRunning(!isRunning);
    setIsComplete(false);
  };

  const reset = () => {
    setIsRunning(false);
    setSeconds({{DURATION}});
    setIsComplete(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{{TITLE}}</Text>
      
      <View style={[styles.timerCircle, isComplete && styles.complete]}>
        <Text style={styles.time}>{formatTime(seconds)}</Text>
      </View>

      {isComplete && (
        <View style={styles.completeMessage}>
          <Bell size={24} color="#4CAF50" />
          <Text style={styles.completeText}>Time's up!</Text>
        </View>
      )}

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.resetButton} onPress={reset}>
          <RotateCcw size={24} color="#666" />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.mainButton, isRunning && styles.pauseButton]} onPress={toggle}>
          {isRunning ? <Pause size={32} color="#FFF" /> : <Play size={32} color="#FFF" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 48 },
  timerCircle: { width: 250, height: 250, borderRadius: 125, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 8, borderColor: '#26A69A' },
  complete: { borderColor: '#4CAF50', backgroundColor: '#E8F5E9' },
  time: { fontSize: 56, fontWeight: 'bold', color: '#333' },
  completeMessage: { flexDirection: 'row', alignItems: 'center', marginTop: 24 },
  completeText: { fontSize: 20, color: '#4CAF50', marginLeft: 8, fontWeight: '600' },
  buttons: { flexDirection: 'row', alignItems: 'center', marginTop: 48, gap: 24 },
  resetButton: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#E0E0E0', alignItems: 'center', justifyContent: 'center' },
  mainButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#26A69A', alignItems: 'center', justifyContent: 'center' },
  pauseButton: { backgroundColor: '#FF9800' },
});
`);

    // Sports/Shift Tracker Template (Hockey, Basketball, etc.)
    this.templates.set('sports_tracker', `
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Play, Square, History, Clock, Save, Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SportsTracker() {
  const [currentView, setCurrentView] = useState('main');
  const [currentPeriod, setCurrentPeriod] = useState('1st');
  const [isTracking, setIsTracking] = useState(false);
  const [shiftStart, setShiftStart] = useState(null);
  const [currentDuration, setCurrentDuration] = useState(0);
  const [shifts, setShifts] = useState({ '1st': [], '2nd': [], '3rd': [], 'OT': [] });
  const [games, setGames] = useState([]);
  const [expandedGame, setExpandedGame] = useState(null);
  const intervalRef = useRef(null);

  const periods = ['1st', '2nd', '3rd', 'OT'];

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    if (isTracking) {
      intervalRef.current = setInterval(() => {
        setCurrentDuration(Math.floor((Date.now() - shiftStart) / 1000));
      }, 100);
    }
    return () => clearInterval(intervalRef.current);
  }, [isTracking, shiftStart]);

  const loadGames = async () => {
    try {
      const saved = await AsyncStorage.getItem('@sports_games');
      if (saved) setGames(JSON.parse(saved) || []);
    } catch (e) {
      console.error('Load error:', e);
    }
  };

  const saveGames = async (newGames) => {
    try {
      await AsyncStorage.setItem('@sports_games', JSON.stringify(newGames));
    } catch (e) {
      console.error('Save error:', e);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins.toString().padStart(2, '0') + ':' + secs.toString().padStart(2, '0');
  };

  const startShift = () => {
    setShiftStart(Date.now());
    setIsTracking(true);
    setCurrentDuration(0);
  };

  const stopShift = () => {
    if (!isTracking) return;
    const duration = Math.floor((Date.now() - shiftStart) / 1000);
    const newShift = { id: Date.now(), duration, time: new Date().toLocaleTimeString() };
    setShifts(prev => ({
      ...prev,
      [currentPeriod]: [...(prev[currentPeriod] || []), newShift]
    }));
    setIsTracking(false);
    setCurrentDuration(0);
    setShiftStart(null);
  };

  const deleteShift = (period, shiftId) => {
    setShifts(prev => ({
      ...prev,
      [period]: (prev[period] || []).filter(s => s.id !== shiftId)
    }));
  };

  const endGame = () => {
    Alert.alert('End Game', 'Save this game and clear shifts?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Save & End', onPress: () => {
        const totalShifts = Object.values(shifts).flat().length;
        const totalTime = Object.values(shifts).flat().reduce((sum, s) => sum + s.duration, 0);
        const game = {
          id: Date.now(),
          date: new Date().toLocaleDateString(),
          shifts: { ...shifts },
          totalShifts,
          totalTime,
          avgShift: totalShifts > 0 ? Math.round(totalTime / totalShifts) : 0
        };
        const newGames = [game, ...games];
        setGames(newGames);
        saveGames(newGames);
        setShifts({ '1st': [], '2nd': [], '3rd': [], 'OT': [] });
      }}
    ]);
  };

  const getPeriodStats = (period) => {
    const periodShifts = shifts[period] || [];
    const count = periodShifts.length;
    const total = periodShifts.reduce((sum, s) => sum + s.duration, 0);
    return { count, total };
  };

  const getTotalStats = () => {
    let count = 0, total = 0;
    Object.values(shifts).forEach(arr => {
      count += arr.length;
      total += arr.reduce((sum, s) => sum + s.duration, 0);
    });
    return { count, total, avg: count > 0 ? Math.round(total / count) : 0 };
  };

  // History View
  if (currentView === 'history') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setCurrentView('main')}>
            <Text style={styles.backButton}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Game History</Text>
        </View>
        <ScrollView style={styles.historyList}>
          {games.length === 0 ? (
            <Text style={styles.emptyText}>No games recorded yet</Text>
          ) : games.map(game => (
            <TouchableOpacity 
              key={game.id} 
              style={styles.gameCard}
              onPress={() => setExpandedGame(expandedGame === game.id ? null : game.id)}
            >
              <View style={styles.gameHeader}>
                <Text style={styles.gameDate}>{game.date}</Text>
                {expandedGame === game.id ? <ChevronUp size={20} color="#666" /> : <ChevronDown size={20} color="#666" />}
              </View>
              <View style={styles.gameStats}>
                <Text style={styles.statText}>{game.totalShifts} shifts</Text>
                <Text style={styles.statText}>{formatTime(game.totalTime)} total</Text>
                <Text style={styles.statText}>{formatTime(game.avgShift)} avg</Text>
              </View>
              {expandedGame === game.id && (
                <View style={styles.periodBreakdown}>
                  {periods.map(p => {
                    const pShifts = game.shifts[p] || [];
                    if (pShifts.length === 0) return null;
                    return (
                      <View key={p} style={styles.periodDetail}>
                        <Text style={styles.periodLabel}>{p} Period</Text>
                        {pShifts.map((s, i) => (
                          <Text key={s.id} style={styles.shiftDetail}>
                            Shift {i + 1}: {formatTime(s.duration)}
                          </Text>
                        ))}
                      </View>
                    );
                  })}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Main View
  const totalStats = getTotalStats();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Shift Tracker</Text>
        <TouchableOpacity onPress={() => setCurrentView('history')}>
          <History size={24} color="#26A69A" />
        </TouchableOpacity>
      </View>

      {/* Period Selection */}
      <View style={styles.periodSelector}>
        {periods.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, currentPeriod === p && styles.periodActive]}
            onPress={() => setCurrentPeriod(p)}
          >
            <Text style={[styles.periodText, currentPeriod === p && styles.periodTextActive]}>{p}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timer Display */}
      <View style={[styles.timerContainer, isTracking && styles.timerActive]}>
        <Text style={styles.timerText}>{formatTime(currentDuration)}</Text>
        <Text style={styles.timerLabel}>{isTracking ? 'ON ICE' : 'READY'}</Text>
      </View>

      {/* Start/Stop Button */}
      <TouchableOpacity
        style={[styles.mainButton, isTracking && styles.stopButton]}
        onPress={isTracking ? stopShift : startShift}
      >
        {isTracking ? <Square size={40} color="#FFF" /> : <Play size={40} color="#FFF" />}
      </TouchableOpacity>

      {/* Current Period Shifts */}
      <View style={styles.shiftsSection}>
        <Text style={styles.sectionTitle}>{currentPeriod} Period Shifts</Text>
        <ScrollView style={styles.shiftsList} horizontal>
          {(shifts[currentPeriod] || []).map((shift, idx) => (
            <View key={shift.id} style={styles.shiftChip}>
              <Text style={styles.shiftText}>#{idx + 1}: {formatTime(shift.duration)}</Text>
              <TouchableOpacity onPress={() => deleteShift(currentPeriod, shift.id)}>
                <Trash2 size={14} color="#F44336" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Stats Summary */}
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{totalStats.count}</Text>
          <Text style={styles.statLabel}>Total Shifts</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(totalStats.total)}</Text>
          <Text style={styles.statLabel}>Ice Time</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatTime(totalStats.avg)}</Text>
          <Text style={styles.statLabel}>Avg Shift</Text>
        </View>
      </View>

      {/* End Game Button */}
      <TouchableOpacity style={styles.endGameButton} onPress={endGame}>
        <Save size={20} color="#FFF" />
        <Text style={styles.endGameText}>End Game</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  backButton: { fontSize: 16, color: '#26A69A', fontWeight: '600' },
  periodSelector: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24, gap: 8 },
  periodButton: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: '#E0E0E0' },
  periodActive: { backgroundColor: '#26A69A' },
  periodText: { fontSize: 16, fontWeight: '600', color: '#666' },
  periodTextActive: { color: '#FFF' },
  timerContainer: { alignItems: 'center', backgroundColor: '#FFF', padding: 32, borderRadius: 16, marginBottom: 24 },
  timerActive: { backgroundColor: '#E8F5E9', borderWidth: 2, borderColor: '#4CAF50' },
  timerText: { fontSize: 64, fontWeight: 'bold', color: '#333' },
  timerLabel: { fontSize: 14, color: '#666', marginTop: 8, letterSpacing: 2 },
  mainButton: { alignSelf: 'center', width: 100, height: 100, borderRadius: 50, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stopButton: { backgroundColor: '#F44336' },
  shiftsSection: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 8 },
  shiftsList: { maxHeight: 50 },
  shiftChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, marginRight: 8, gap: 8 },
  shiftText: { fontSize: 14, color: '#333' },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  statBox: { alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#26A69A' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 4 },
  endGameButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF9800', padding: 16, borderRadius: 12, gap: 8 },
  endGameText: { fontSize: 16, fontWeight: '600', color: '#FFF' },
  historyList: { flex: 1 },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 48, fontSize: 16 },
  gameCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12 },
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  gameDate: { fontSize: 18, fontWeight: '600', color: '#333' },
  gameStats: { flexDirection: 'row', marginTop: 8, gap: 16 },
  statText: { fontSize: 14, color: '#666' },
  periodBreakdown: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#EEE' },
  periodDetail: { marginBottom: 12 },
  periodLabel: { fontSize: 14, fontWeight: '600', color: '#26A69A', marginBottom: 4 },
  shiftDetail: { fontSize: 13, color: '#666', marginLeft: 8 },
});
`);

    // Initialize pattern matchers - ORDER MATTERS (most specific first)
    // sports_tracker: Only match when explicitly asking for shift/time/period tracking
    this.patterns.set('sports_tracker', /shift\s*(track|timer|log)|ice\s*time|period\s*track|game\s*time\s*track|time\s*on\s*ice/i);
    this.patterns.set('water_tracker', /water|hydrat|drink|fluid|liquid/i);
    this.patterns.set('habit_tracker', /habit|daily|routine|streak|track.*habit/i);
    this.patterns.set('counter', /\b(count|counter|tally|increment)\b(?!.*shift)(?!.*game)/i);
    this.patterns.set('timer', /timer|countdown|pomodoro|stopwatch|\bminute\b/i);

    // Template descriptions for semantic similarity matching
    this.templateDescriptions = new Map([
      ['sports_tracker', {
        name: 'Sports Shift Tracker',
        description: 'Track shift durations and ice time for hockey, basketball, or other sports with periods/quarters. Features start/stop timer, period selection, shift history, and game saving.',
        keywords: ['shift', 'ice time', 'period', 'quarter', 'game', 'timer', 'duration', 'sports', 'hockey', 'basketball', 'track time'],
      }],
      ['water_tracker', {
        name: 'Hydration Tracker',
        description: 'Track daily water intake with customizable goals. Log glasses or milliliters of water consumed throughout the day.',
        keywords: ['water', 'hydration', 'drink', 'fluid', 'intake', 'glasses', 'health', 'daily goal'],
      }],
      ['habit_tracker', {
        name: 'Habit Tracker',
        description: 'Build and maintain daily habits with streak tracking. Mark habits complete each day and track your consistency over time.',
        keywords: ['habit', 'daily', 'routine', 'streak', 'consistency', 'goal', 'track', 'complete'],
      }],
      ['counter', {
        name: 'Simple Counter',
        description: 'A basic counter for tallying anything. Increment, decrement, and reset with a clean interface.',
        keywords: ['count', 'counter', 'tally', 'increment', 'decrement', 'number', 'track'],
      }],
      ['timer', {
        name: 'Timer / Countdown',
        description: 'Countdown timer or stopwatch for timing activities. Set duration and get notified when time is up.',
        keywords: ['timer', 'countdown', 'stopwatch', 'pomodoro', 'minutes', 'seconds', 'alarm', 'time'],
      }],
    ]);
  }

  // Template descriptions for semantic matching
  private templateDescriptions: Map<string, { name: string; description: string; keywords: string[] }> = new Map();

  matchTemplate(input: string): string | null {
    const normalizedInput = input.toLowerCase();
    
    const patternEntries = Array.from(this.patterns.entries());
    for (const [templateName, pattern] of patternEntries) {
      if (pattern.test(normalizedInput)) {
        return templateName;
      }
    }
    
    return null;
  }

  /**
   * Calculate semantic similarity between user input and a template
   * Returns a score from 0-100
   */
  calculateSimilarity(input: string, templateName: string): number {
    const templateInfo = this.templateDescriptions.get(templateName);
    if (!templateInfo) return 0;

    const normalizedInput = input.toLowerCase();
    const words = normalizedInput.split(/\s+/);
    
    let score = 0;
    let maxScore = 0;

    // Keyword matching (weighted heavily)
    for (const keyword of templateInfo.keywords) {
      maxScore += 10;
      const keywordLower = keyword.toLowerCase();
      if (normalizedInput.includes(keywordLower)) {
        // Exact keyword match
        score += 10;
      } else {
        // Partial word match
        const keywordParts = keywordLower.split(' ');
        for (const part of keywordParts) {
          if (words.some(w => w.includes(part) || part.includes(w))) {
            score += 5;
            break;
          }
        }
      }
    }

    // Description word overlap
    const descWords = templateInfo.description.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const inputWords = words.filter(w => w.length > 3);
    const overlap = inputWords.filter(w => descWords.some(d => d.includes(w) || w.includes(d)));
    score += Math.min(overlap.length * 3, 20);
    maxScore += 20;

    // Normalize to 0-100
    const normalizedScore = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    return Math.min(normalizedScore, 100);
  }

  /**
   * Find template suggestions with similarity scores
   * Only returns templates with >= minSimilarity match
   */
  findTemplateSuggestions(input: string, minSimilarity: number = 90): Array<{
    templateName: string;
    templateInfo: { name: string; description: string };
    similarity: number;
  }> {
    const suggestions: Array<{
      templateName: string;
      templateInfo: { name: string; description: string };
      similarity: number;
    }> = [];

    for (const [templateName, templateInfo] of this.templateDescriptions) {
      const similarity = this.calculateSimilarity(input, templateName);
      if (similarity >= minSimilarity) {
        suggestions.push({
          templateName,
          templateInfo: { name: templateInfo.name, description: templateInfo.description },
          similarity,
        });
      }
    }

    // Sort by similarity descending
    suggestions.sort((a, b) => b.similarity - a.similarity);
    return suggestions;
  }

  generateFromTemplate(templateName: string, params: Record<string, any>): string {
    let template = this.templates.get(templateName);
    const templateSize = template?.length || 0;
    console.log('[LocalTemplateEngine] Getting template:', templateName, '- found:', !!template, '- size:', templateSize);
    
    // Debug: list all available templates
    if (!template) {
      console.log('[LocalTemplateEngine] Available templates:', Array.from(this.templates.keys()));
      return '';
    }
    
    // Return early for sports_tracker - no parameter substitution needed
    if (templateName === 'sports_tracker') {
      console.log('[LocalTemplateEngine] Sports tracker template - returning directly, length:', template.length);
      return template;
    }

    // Replace all parameters
    for (const [key, value] of Object.entries(params)) {
      const placeholder = new RegExp(`{{${key.toUpperCase()}}}`, 'g');
      template = template.replace(placeholder, String(value));
    }

    // Generate buttons for water tracker
    if (templateName === 'water_tracker' && params.amounts) {
      const buttons = params.amounts.map((amount: number) => 
        `<TouchableOpacity style={styles.button} onPress={() => addWater(${amount})}>\n          <Text style={styles.buttonText}>+${amount}</Text>\n        </TouchableOpacity>`
      ).join('\n        ');
      template = template.replace('{{BUTTONS}}', buttons);
    }

    // Generate unique ID
    template = template.replace(/{{ID}}/g, Math.random().toString(36).substring(7));

    return template;
  }

  extractParameters(input: string, templateName: string): Record<string, any> {
    const params: Record<string, any> = {};
    const normalizedInput = input.toLowerCase();

    switch (templateName) {
      case 'water_tracker':
        params.GOAL = this.extractNumber(input, 'goal', 2000);
        params.UNIT = normalizedInput.includes('oz') ? 'oz' : 'ml';
        params.amounts = normalizedInput.includes('oz') ? [4, 8, 12, 16] : [100, 250, 500, 1000];
        break;

      case 'habit_tracker':
        params.TITLE = this.extractTitle(input) || 'My Habits';
        break;

      case 'counter':
        params.TITLE = this.extractTitle(input) || 'Counter';
        params.STEP = this.extractNumber(input, 'step', 1);
        params.UNIT = this.extractUnit(input) || '';
        break;

      case 'timer':
        params.TITLE = this.extractTitle(input) || 'Timer';
        const minutes = this.extractNumber(input, 'minute', 25);
        params.DURATION = minutes * 60;
        break;

      case 'sports_tracker':
        // Sports tracker doesn't need parameters - it's fully self-contained
        break;
    }

    return params;
  }

  private extractNumber(input: string, context: string, defaultValue: number): number {
    const patterns = [
      new RegExp(`(\\d+)\\s*${context}`, 'i'),
      new RegExp(`${context}\\s*(\\d+)`, 'i'),
      /(\d+)\s*(ml|oz|minutes?|hours?|steps?)/i,
      /(\d+)/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        return parseInt(match[1], 10);
      }
    }

    return defaultValue;
  }

  private extractTitle(input: string): string | null {
    // Try to extract a meaningful title from the input
    const patterns = [
      /(?:called?|named?|titled?)\s+["']?([^"']+)["']?/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/,
    ];

    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) return match[1].trim();
    }

    return null;
  }

  private extractUnit(input: string): string | null {
    const unitPatterns = [
      /\b(ml|oz|cups?|liters?|gallons?)\b/i,
      /\b(minutes?|hours?|seconds?)\b/i,
      /\b(steps?|reps?|sets?)\b/i,
      /\b(calories?|kcal)\b/i,
    ];

    for (const pattern of unitPatterns) {
      const match = input.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}

// ============================================================================
// RESPONSE CACHE
// ============================================================================

class ResponseCache {
  private cache: Map<string, CachedResponse> = new Map();
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const saved = await AsyncStorage.getItem(CACHE_KEY);
      if (saved) {
        const entries: CachedResponse[] = JSON.parse(saved);
        const now = Date.now();
        
        // Filter out expired entries
        for (const entry of entries) {
          if (now - entry.timestamp < CACHE_TTL_MS) {
            this.cache.set(entry.inputHash, entry);
          }
        }
      }
    } catch (e) {
      console.error('[ResponseCache] Load error:', e);
    }
    
    this.initialized = true;
  }

  private hash(input: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  get(input: string): CachedResponse | null {
    const inputHash = this.hash(input.toLowerCase().trim());
    const cached = this.cache.get(inputHash);
    
    if (cached) {
      // Validate cached output is not truncated
      const output = cached.output;
      if (!output || output.length < 500) {
        console.warn('[ResponseCache] Cached entry too short, removing:', output?.length || 0);
        this.cache.delete(inputHash);
        return null;
      }
      // Check for truncation signatures (code cut mid-statement)
      if (output.includes('useStat.') || output.includes('setS.') || !output.includes('export default')) {
        console.warn('[ResponseCache] Cached entry appears truncated, removing');
        this.cache.delete(inputHash);
        return null;
      }
      cached.usageCount++;
      return cached;
    }
    
    // Try fuzzy match
    const normalizedInput = input.toLowerCase().trim();
    const cacheEntries = Array.from(this.cache.entries());
    for (const [, entry] of cacheEntries) {
      if (this.isSimilar(normalizedInput, entry.input.toLowerCase())) {
        entry.usageCount++;
        return entry;
      }
    }
    
    return null;
  }

  private isSimilar(a: string, b: string): boolean {
    // Simple similarity check
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));
    
    let matches = 0;
    const wordsAArray = Array.from(wordsA);
    for (const word of wordsAArray) {
      if (wordsB.has(word)) matches++;
    }
    
    return matches / Math.max(wordsA.size, wordsB.size) > 0.8;
  }

  async set(input: string, output: string, model: string): Promise<void> {
    // Validate output before caching - don't store truncated code
    if (!output || output.length < 500) {
      console.warn('[ResponseCache] Refusing to cache short output:', output?.length || 0);
      return;
    }
    if (!output.includes('export default')) {
      console.warn('[ResponseCache] Refusing to cache code without export default');
      return;
    }
    // Check for truncation signatures
    if (output.includes('useStat.') || output.includes('setS.') || output.endsWith('.')) {
      console.warn('[ResponseCache] Refusing to cache truncated code');
      return;
    }
    
    const inputHash = this.hash(input.toLowerCase().trim());
    
    console.log('[ResponseCache] Caching valid output, length:', output.length);
    this.cache.set(inputHash, {
      input: input.toLowerCase().trim(),
      inputHash,
      output,
      model,
      timestamp: Date.now(),
      usageCount: 1,
    });

    // Prune if too large
    if (this.cache.size > MAX_CACHE_SIZE) {
      await this.prune();
    }

    await this.save();
  }

  private async prune(): Promise<void> {
    // Remove least used entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].usageCount - b[1].usageCount);
    
    const toRemove = entries.slice(0, Math.floor(MAX_CACHE_SIZE * 0.2));
    for (const [key] of toRemove) {
      this.cache.delete(key);
    }
  }

  private async save(): Promise<void> {
    try {
      const entries = Array.from(this.cache.values());
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.error('[ResponseCache] Save error:', e);
    }
  }
}

// ============================================================================
// LOCAL MODEL FALLBACK CLASS
// ============================================================================

class LocalModelFallbackImpl {
  private templateEngine: LocalTemplateEngine;
  private responseCache: ResponseCache;
  private networkAvailable = true;
  private lastNetworkCheck = 0;

  constructor() {
    this.templateEngine = new LocalTemplateEngine();
    this.responseCache = new ResponseCache();
  }

  async initialize(): Promise<void> {
    await this.responseCache.initialize();
  }

  // ==========================================================================
  // COST OPTIMIZATION - AI-FIRST APPROACH
  // ==========================================================================

  /**
   * Check for template suggestions (90%+ match) without forcing their use
   * This is for UI to offer the user a choice
   */
  getTemplateSuggestions(input: string): Array<{
    templateName: string;
    templateInfo: { name: string; description: string };
    similarity: number;
  }> {
    return this.templateEngine.findTemplateSuggestions(input, 90);
  }

  /**
   * Generate code from a specific template (when user accepts suggestion)
   */
  async generateFromTemplate(templateName: string): Promise<InferenceResult> {
    const startTime = Date.now();
    const template = this.templateEngine.generateFromTemplate(templateName, {});
    
    if (template) {
      return {
        success: true,
        output: template,
        model: 'local-template',
        latencyMs: Date.now() - startTime,
        cost: 0,
        fromCache: false,
        tokensUsed: 0,
        offline: true,
      };
    }
    
    return {
      success: false,
      output: '',
      model: 'local-template',
      latencyMs: Date.now() - startTime,
      cost: 0,
      fromCache: false,
      error: `Template "${templateName}" not found`,
      tokensUsed: 0,
      offline: true,
    };
  }

  optimizeModel(input: string, options: { forceOffline?: boolean; maxCost?: number; useTemplate?: string } = {}): CostOptimizationResult {
    const inputLength = input.length;
    const estimatedTokens = Math.ceil(inputLength / 4);

    // If user explicitly chose a template, use it
    if (options.useTemplate) {
      return {
        recommendedModel: 'local-template',
        estimatedCost: 0,
        estimatedLatency: 50,
        reasoning: `User selected "${options.useTemplate}" template`,
      };
    }

    // Check cache for exact previous generation
    const cacheHit = this.responseCache.get(input);
    if (cacheHit) {
      return {
        recommendedModel: 'cached',
        estimatedCost: 0,
        estimatedLatency: 10,
        reasoning: 'Exact response found in cache from previous generation',
      };
    }

    // If offline forced or network unavailable, use template as fallback
    if (options.forceOffline || !this.networkAvailable) {
      const templateMatch = this.templateEngine.matchTemplate(input);
      if (templateMatch) {
        return {
          recommendedModel: 'local-template',
          estimatedCost: 0,
          estimatedLatency: 100,
          reasoning: `Offline mode - using "${templateMatch}" template as fallback`,
        };
      }
      return {
        recommendedModel: 'local-template',
        estimatedCost: 0,
        estimatedLatency: 100,
        reasoning: 'Offline mode - using generic local generation',
      };
    }

    // Cost-based selection
    const grokCost = estimatedTokens * (MODEL_CONFIGS['grok-3-fast'].costPerToken || 0);
    const miniCost = estimatedTokens * (MODEL_CONFIGS['grok-3-mini'].costPerToken || 0);

    if (options.maxCost !== undefined && grokCost > options.maxCost) {
      if (miniCost <= options.maxCost) {
        return {
          recommendedModel: 'grok-3-mini',
          estimatedCost: miniCost,
          estimatedLatency: 1000,
          reasoning: `Full model exceeds cost limit, using mini model`,
        };
      }
      // Fallback to template only if cost is an issue
      const templateMatch = this.templateEngine.matchTemplate(input);
      if (templateMatch) {
        return {
          recommendedModel: 'local-template',
          estimatedCost: 0,
          estimatedLatency: 100,
          reasoning: `Cost limit exceeded - using "${templateMatch}" template as fallback`,
        };
      }
    }

    // DEFAULT: Always use AI for custom generation
    return {
      recommendedModel: 'grok-3-fast',
      estimatedCost: grokCost,
      estimatedLatency: 2000,
      reasoning: 'Using AI for custom oracle generation',
    };
  }

  // ==========================================================================
  // INFERENCE
  // ==========================================================================

  async infer(
    input: string,
    systemPrompt: string,
    options: { forceOffline?: boolean; maxCost?: number; preferredModel?: string } = {}
  ): Promise<InferenceResult> {
    await this.initialize();
    const startTime = Date.now();

    // Check for cached response first
    const cached = this.responseCache.get(input);
    if (cached) {
      // Extra validation: ensure cached output is valid
      const cachedOutput = cached.output;
      if (cachedOutput && cachedOutput.length > 500 && cachedOutput.includes('export default')) {
        console.log('[LocalModelFallback] Cache hit, output length:', cachedOutput.length);
        return {
          success: true,
          output: cachedOutput,
          model: 'cached',
          latencyMs: Date.now() - startTime,
          tokensUsed: 0,
          cost: 0,
          fromCache: true,
          offline: true,
        };
      } else {
        console.warn('[LocalModelFallback] Cache entry invalid (length:', cachedOutput?.length, '), skipping cache');
      }
    }

    // Try local template
    const templateMatch = this.templateEngine.matchTemplate(input);
    if (templateMatch) {
      console.log('[LocalModelFallback] Using template:', templateMatch);
      const params = this.templateEngine.extractParameters(input, templateMatch);
      console.log('[LocalModelFallback] Template params:', JSON.stringify(params));
      const output = this.templateEngine.generateFromTemplate(templateMatch, params);
      console.log('[LocalModelFallback] Template output length:', output?.length || 0);
      
      if (output && output.length > 100) {
        // Cache the result
        await this.responseCache.set(input, output, 'local-template');
        
        return {
          success: true,
          output,
          model: 'local-template',
          latencyMs: Date.now() - startTime,
          tokensUsed: 0,
          cost: 0,
          fromCache: false,
          offline: true,
        };
      } else {
        console.warn('[LocalModelFallback] Template output too short or empty, falling back to remote');
      }
    }

    // If forced offline and no template, try to generate basic component
    if (options.forceOffline || !this.networkAvailable) {
      const fallbackOutput = this.generateFallbackComponent(input);
      return {
        success: true,
        output: fallbackOutput,
        model: 'local-fallback',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        cost: 0,
        fromCache: false,
        offline: true,
      };
    }

    // Use remote model
    const modelToUse = options.preferredModel || 'grok-3-fast';
    const config = MODEL_CONFIGS[modelToUse];

    if (!config || config.type !== 'remote') {
      return {
        success: false,
        output: '',
        model: modelToUse,
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        cost: 0,
        fromCache: false,
        offline: false,
        error: `Invalid model: ${modelToUse}`,
      };
    }

    try {
      const response = await fetch(config.endpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.name,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: input },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const output = data.choices?.[0]?.message?.content || '';
      const tokensUsed = data.usage?.total_tokens || Math.ceil(output.length / 4);
      const cost = tokensUsed * (config.costPerToken || 0);

      // Cache successful response
      await this.responseCache.set(input, output, modelToUse);

      return {
        success: true,
        output,
        model: modelToUse,
        latencyMs: Date.now() - startTime,
        tokensUsed,
        cost,
        fromCache: false,
        offline: false,
      };

    } catch (error: any) {
      console.error('[LocalModelFallback] Remote inference failed:', error);
      
      // Mark network as unavailable
      this.networkAvailable = false;
      
      // Fall back to local generation
      const fallbackOutput = this.generateFallbackComponent(input);
      return {
        success: true,
        output: fallbackOutput,
        model: 'local-fallback',
        latencyMs: Date.now() - startTime,
        tokensUsed: 0,
        cost: 0,
        fromCache: false,
        offline: true,
        error: `Remote failed, used fallback: ${error.message}`,
      };
    }
  }

  private generateFallbackComponent(input: string): string {
    // Generate a basic component when everything else fails
    const title = input.split(/[.!?]/)[0].substring(0, 50);
    
    return `
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Info } from 'lucide-react-native';

export default function GeneratedComponent() {
  const [message, setMessage] = useState('');

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Info size={48} color="#26A69A" />
        <Text style={styles.title}>${title}</Text>
      </View>
      
      <View style={styles.content}>
        <Text style={styles.description}>
          This component was generated offline. Full functionality requires network connection.
        </Text>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={() => setMessage('Feature coming soon!')}
        >
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>
        
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', padding: 16 },
  header: { alignItems: 'center', marginVertical: 32 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginTop: 16, textAlign: 'center' },
  content: { backgroundColor: '#FFF', borderRadius: 16, padding: 24, alignItems: 'center' },
  description: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 24 },
  button: { backgroundColor: '#26A69A', paddingVertical: 16, paddingHorizontal: 48, borderRadius: 12 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '600' },
  message: { marginTop: 16, color: '#26A69A', fontSize: 16 },
});
`;
  }

  // ==========================================================================
  // NETWORK STATUS
  // ==========================================================================

  setNetworkStatus(available: boolean): void {
    this.networkAvailable = available;
  }

  isNetworkAvailable(): boolean {
    return this.networkAvailable;
  }
}

// Singleton instance
export const LocalModelFallback = new LocalModelFallbackImpl();
