import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Switch } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Bell, Plus, Trash2 } from 'lucide-react-native';
import colors from '@/constants/colors';
import { ReminderOracleConfig } from '../types';

type Time = { hour: number; minute: number };

function toKey(t: Time) {
  return String(t.hour).padStart(2, '0') + ':' + String(t.minute).padStart(2, '0');
}

export default function ReminderOracle(props: { config: ReminderOracleConfig }) {
  const { config } = props;
  const storageKey = 'oracle_' + config.id + '_reminder';

  const [isLoading, setIsLoading] = useState(true);
  const [enabled, setEnabled] = useState(false);
  const [times, setTimes] = useState<Time[]>(() => {
    const start = Math.max(0, Math.min(23, config.startHour));
    const end = Math.max(0, Math.min(23, config.endHour));
    const interval = Math.max(15, Math.min(180, config.intervalMinutes));
    const out: Time[] = [];
    const startMin = start * 60;
    const endMin = end * 60;
    for (let t = startMin; t <= endMin; t += interval) {
      out.push({ hour: Math.floor(t / 60), minute: t % 60 });
    }
    return out.length ? out : [{ hour: 10, minute: 0 }];
  });
  const [newTime, setNewTime] = useState('12:00');
  const [scheduledIds, setScheduledIds] = useState<string[]>([]);

  const requestPerm = useCallback(async () => {
    const current = await Notifications.getPermissionsAsync();
    if (current.status === 'granted') return true;
    const next = await Notifications.requestPermissionsAsync();
    return next.status === 'granted';
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(storageKey);
        if (saved) {
          const data = JSON.parse(saved);
          if (typeof data.enabled === 'boolean') setEnabled(data.enabled);
          if (Array.isArray(data.times)) setTimes(data.times);
          if (Array.isArray(data.scheduledIds)) setScheduledIds(data.scheduledIds);
        }
      } catch (e) {
        console.log('[ReminderOracle] load failed', e);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [storageKey]);

  useEffect(() => {
    if (isLoading) return;
    (async () => {
      try {
        await AsyncStorage.setItem(storageKey, JSON.stringify({ enabled, times, scheduledIds }));
      } catch (e) {
        console.log('[ReminderOracle] save failed', e);
      }
    })();
  }, [enabled, times, scheduledIds, isLoading, storageKey]);

  const cancelAll = useCallback(async () => {
    for (const id of scheduledIds) {
      try {
        await Notifications.cancelScheduledNotificationAsync(id);
      } catch {}
    }
    setScheduledIds([]);
  }, [scheduledIds]);

  const scheduleAll = useCallback(async () => {
    const ok = await requestPerm();
    if (!ok) {
      Alert.alert('Notifications disabled', 'Enable notifications to use reminders.');
      setEnabled(false);
      return;
    }

    await cancelAll();

    const ids: string[] = [];
    for (const t of times) {
      const id = await Notifications.scheduleNotificationAsync({
          content: { title: 'Reminder', body: config.message },
        trigger: { hour: t.hour, minute: t.minute, repeats: true },
      });
      ids.push(id);
    }
    setScheduledIds(ids);
  }, [cancelAll, requestPerm, times]);

  useEffect(() => {
    if (!enabled) return;
    (async () => {
      try {
        await scheduleAll();
      } catch (e) {
        console.log('[ReminderOracle] schedule failed', e);
      }
    })();
  }, [enabled, scheduleAll]);

  const addTime = useCallback(() => {
    const m = newTime.match(/^(\d{1,2}):(\d{2})$/);
    if (!m) {
      Alert.alert('Invalid time', 'Use HH:MM (24h).');
      return;
    }
    const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
    const mi = Math.max(0, Math.min(59, parseInt(m[2], 10)));
    const key = String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
    if (times.some(t => toKey(t) === key)) {
      Alert.alert('Duplicate', 'That time already exists.');
      return;
    }
    setTimes(prev => [...prev, { hour: h, minute: mi }].sort((a, b) => toKey(a).localeCompare(toKey(b))));
  }, [newTime, times]);

  const removeTime = useCallback((key: string) => {
    setTimes(prev => prev.filter(t => toKey(t) !== key));
  }, []);

  const sorted = useMemo(() => [...times].sort((a, b) => toKey(a).localeCompare(toKey(b))), [times]);

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Loading reminders…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Bell size={18} color={colors.accent} />
        <Text style={styles.title}>{config.title}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <Text style={styles.label}>Enable reminders</Text>
          <Switch
            value={enabled}
            onValueChange={(v) => {
              setEnabled(v);
              if (!v) {
                (async () => {
                  await cancelAll();
                })();
              }
            }}
          />
        </View>
        <Text style={styles.muted}>Schedules daily notifications at selected times.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Times</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.input}
            value={newTime}
            onChangeText={setNewTime}
            placeholder="HH:MM"
            placeholderTextColor={colors.textMuted}
          />
          <TouchableOpacity style={styles.button} onPress={addTime} activeOpacity={0.85}>
            <Plus size={16} color={colors.background} />
            <Text style={styles.buttonText}>Add</Text>
          </TouchableOpacity>
        </View>

        {sorted.length === 0 ? (
          <Text style={styles.muted}>No times yet. Add one above.</Text>
        ) : (
          sorted.map(t => {
            const key = toKey(t);
            return (
              <View key={key} style={styles.timeRow}>
                <Text style={styles.timeText}>{key}</Text>
                <TouchableOpacity onPress={() => removeTime(key)} style={styles.trash}>
                  <Trash2 size={16} color={colors.error} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {enabled && (
          <TouchableOpacity style={styles.secondary} onPress={scheduleAll}>
            <Text style={styles.secondaryText}>Re-schedule Now</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: 16, paddingBottom: 40 },
  center: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
  },
  label: { color: colors.text, fontSize: 13, fontWeight: '800' },
  muted: { color: colors.textMuted, fontSize: 12, marginTop: 6 },
  row: { flexDirection: 'row', gap: 10, marginTop: 12, alignItems: 'center' },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  input: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  button: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  buttonText: { color: colors.background, fontWeight: '800', fontSize: 13 },
  timeRow: {
    marginTop: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeText: { color: colors.text, fontSize: 14, fontWeight: '700' },
  trash: { padding: 6 },
  secondary: { marginTop: 12, paddingVertical: 10, alignItems: 'center' },
  secondaryText: { color: colors.accent, fontSize: 12, fontWeight: '800' },
});

