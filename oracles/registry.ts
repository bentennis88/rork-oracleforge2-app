import React from 'react';
import { OracleConfig } from './types';
import TrackerOracle from './skeletons/TrackerOracle';
import ReminderOracle from './skeletons/ReminderOracle';
import CalculatorOracle from './skeletons/CalculatorOracle';

export function renderOracle(config: OracleConfig) {
  switch (config.type) {
    case 'tracker':
      return <TrackerOracle config={config} />;
    case 'reminder':
      return <ReminderOracle config={config} />;
    case 'calculator':
      return <CalculatorOracle config={config} />;
    default:
      return null;
  }
}

