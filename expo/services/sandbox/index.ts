/**
 * Sandbox System - Barrel Export
 * 
 * Comprehensive pre-deployment validation system featuring:
 * 1. Sandboxed runtime for isolated code execution
 * 2. Device/OS variant simulation
 * 3. Input scenario testing
 * 4. API response simulation
 * 5. Local model fallback for zero-cost offline operation
 * 6. Self-correction engine with automatic error fixing
 * 7. Predictive simulation via digital twin
 */

export { SandboxedRuntime } from './SandboxedRuntime';
export type {
  SandboxConfig,
  SandboxResult,
  SandboxError,
  SandboxWarning,
  DeviceVariant,
  InputScenario,
  APIResponseScenario,
  CoverageReport,
  DeviceTestResult,
  InputTestResult,
  APITestResult,
} from './SandboxedRuntime';

export { LocalModelFallback } from './LocalModelFallback';
export type {
  ModelConfig,
  InferenceResult,
  CostOptimizationResult,
} from './LocalModelFallback';

export { SelfCorrectionEngine } from './SelfCorrectionEngine';
export type {
  CorrectionResult,
  Correction,
  CorrectionType,
  AnomalyDetection,
  Anomaly,
} from './SelfCorrectionEngine';

export { PredictiveSimulator } from './PredictiveSimulator';
export type {
  SimulationConfig,
  SimulationResult,
  StateGraph,
  StateNode,
  StateEdge,
  StateFailure,
  Prediction,
  Recommendation,
  SimulationCoverage,
} from './PredictiveSimulator';
