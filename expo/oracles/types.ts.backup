export type OracleType = 'tracker' | 'reminder' | 'calculator';

export interface OracleConfigBase {
  id: string;
  title: string;
  description?: string;
}

export interface ReminderOracleConfig extends OracleConfigBase {
  type: 'reminder';
  message: string;
  startHour: number;
  endHour: number;
  intervalMinutes: number;
}

export interface TrackerOracleConfig extends OracleConfigBase {
  type: 'tracker';
  unit: string;
  dailyGoal: number;
  incrementOptions: number[];
  chartWindowDays: number;
}

export interface CalculatorOracleConfig extends OracleConfigBase {
  type: 'calculator';
  inputs: {
    key: string;
    label: string;
    unit?: string;
    defaultValue?: number;
  }[];
  /**
   * Formula to be evaluated safely later (e.g. with a dedicated parser).
   * Example: "(a * (1 + rate/100) ** years)"
   */
  formula: string;
}

export type OracleConfig = ReminderOracleConfig | TrackerOracleConfig | CalculatorOracleConfig;

export type OracleSkeletonMeta = {
  type: OracleType;
  id: string;
  title: string;
  description: string;
  /** A short prompt prefix to steer LLM customization */
  promptHint: string;
};

export type OracleComponentProps = {
  userId: string;
  oracleId: string;
  firebaseService: any;
};

