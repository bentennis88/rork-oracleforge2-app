import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { OracleConfig } from '@/contexts/OraclesContext';
import TrackerOracle from './skeletons/TrackerOracle';
import ReminderOracle from './skeletons/ReminderOracle';
import CalculatorOracle from './skeletons/CalculatorOracle';
import colors from '@/constants/colors';

export function renderOracle(config: OracleConfig) {
  if (!config || !config.type) {
    return (
      <View style={styles.error}>
        <Text style={styles.errorText}>Invalid oracle config</Text>
      </View>
    );
  }

  switch (config.type) {
    case 'tracker':
      return <TrackerOracle config={config} />;
    case 'reminder':
      return <ReminderOracle config={config} />;
    case 'calculator':
      return <CalculatorOracle config={config} />;
    default:
      return (
        <View style={styles.error}>
          <Text style={styles.errorText}>Unknown oracle type: {(config as any).type}</Text>
        </View>
      );
  }
}

const styles = StyleSheet.create({
  error: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
  },
});
