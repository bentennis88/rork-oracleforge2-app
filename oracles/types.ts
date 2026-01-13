export type OracleKind = 'tracker' | 'reminder' | 'calculator';

export type OracleSkeletonMeta = {
  kind: OracleKind;
  id: string;
  name: string;
  description: string;
  /** A short prompt prefix to steer LLM customization */
  promptHint: string;
};

export type OracleComponentProps = {
  userId: string;
  oracleId: string;
  firebaseService: any;
};

