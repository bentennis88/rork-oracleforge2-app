/**
 * Neurosymbolic AI System - Barrel Export
 * 
 * This module implements a hybrid neurosymbolic approach to prompt generation:
 * 1. Symbolic reasoning for deterministic, logical inference
 * 2. Knowledge base for facts, rules, and constraints
 * 3. Ambiguity detection for real-time input clarification
 * 4. Deterministic prompt generation (non-probabilistic)
 * 
 * Key Features:
 * - Infinite context retention via persistent session history
 * - First-order logic knowledge representation
 * - Forward and backward chaining inference
 * - Entropy-based ambiguity scoring
 */

export { KnowledgeBase } from './KnowledgeBase';
export type {
  Fact,
  Rule,
  Constraint,
  DomainKnowledge,
  UserContext,
  SessionEntry,
} from './KnowledgeBase';

export { SymbolicReasoner } from './SymbolicReasoner';
export type {
  ReasoningContext,
  InferenceResult,
  ConceptMatch,
} from './SymbolicReasoner';

export { DeterministicPromptGenerator } from './DeterministicPromptGenerator';
export type {
  GeneratedPrompt,
  PromptComponent,
} from './DeterministicPromptGenerator';

export { AmbiguityDetector } from './AmbiguityDetector';
export type {
  AmbiguityAnalysis,
  Ambiguity,
  AmbiguityType,
  ClarificationQuestion,
  ClarificationOption,
  AutoResolution,
} from './AmbiguityDetector';
