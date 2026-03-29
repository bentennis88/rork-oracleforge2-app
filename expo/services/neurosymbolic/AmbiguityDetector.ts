/**
 * AmbiguityDetector - Real-time detection and resolution of input ambiguity
 * Uses entropy scoring and semantic analysis to identify vague inputs
 */

import { KnowledgeBase, UserContext } from './KnowledgeBase';
import { SymbolicReasoner, ReasoningContext, ConceptMatch } from './SymbolicReasoner';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface AmbiguityAnalysis {
  isAmbiguous: boolean;
  overallScore: number; // 0-1, higher = more ambiguous
  ambiguities: Ambiguity[];
  clarificationQuestions: ClarificationQuestion[];
  autoResolutions: AutoResolution[];
  confidence: number;
}

export interface Ambiguity {
  type: AmbiguityType;
  text: string;
  position: number;
  severity: 'low' | 'medium' | 'high';
  description: string;
  possibleInterpretations: string[];
}

export type AmbiguityType = 
  | 'lexical'      // Word has multiple meanings
  | 'syntactic'    // Sentence structure unclear
  | 'semantic'     // Meaning unclear
  | 'referential'  // Unclear what is being referred to
  | 'scope'        // Unclear scope of modifier
  | 'missing'      // Required information missing
  | 'conflicting'; // Conflicting requirements

export interface ClarificationQuestion {
  id: string;
  question: string;
  type: 'single_choice' | 'multiple_choice' | 'text' | 'number' | 'time' | 'unit';
  options?: ClarificationOption[];
  required: boolean;
  relatedAmbiguity: string;
  defaultValue?: string;
  placeholder?: string;
  validation?: ValidationRule;
}

export interface ClarificationOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
}

export interface ValidationRule {
  type: 'regex' | 'range' | 'length';
  pattern?: string;
  min?: number;
  max?: number;
  message: string;
}

export interface AutoResolution {
  ambiguityText: string;
  resolvedTo: string;
  confidence: number;
  source: 'context' | 'user_history' | 'domain_default' | 'statistical';
}

// ============================================================================
// ENTROPY CALCULATION
// ============================================================================

interface TokenEntropy {
  token: string;
  entropy: number;
  possibleMeanings: string[];
}

// ============================================================================
// AMBIGUITY DETECTOR CLASS
// ============================================================================

class AmbiguityDetectorImpl {
  private initialized = false;
  
  // Ambiguous terms with multiple interpretations
  private ambiguousTerms: Map<string, string[]> = new Map([
    ['track', ['monitor/record data', 'follow/trace', 'audio track', 'race track']],
    ['log', ['record/journal', 'wooden log', 'logarithm']],
    ['note', ['written note', 'musical note', 'notification']],
    ['record', ['save data', 'audio/video record', 'best achievement']],
    ['check', ['verify', 'mark as done', 'bank check']],
    ['set', ['configure', 'group/collection', 'exercise set']],
    ['run', ['execute', 'physical running', 'sequence']],
    ['time', ['clock time', 'duration', 'instance/occurrence']],
    ['goal', ['objective', 'sports goal', 'target value']],
    ['score', ['points', 'musical score', 'rating']],
    ['watch', ['observe', 'timepiece', 'guard']],
    ['count', ['number', 'counting action', 'matter/importance']],
    ['light', ['brightness', 'weight', 'ignite']],
    ['period', ['time span', 'game period', 'punctuation']],
    ['ring', ['circular shape', 'sound', 'jewelry']],
  ]);

  // Required context for different app types
  private requiredContext: Map<string, string[]> = new Map([
    ['water_tracker', ['unit_preference', 'daily_goal', 'reminder_times']],
    ['medication_tracker', ['medications', 'dosage', 'schedule']],
    ['exercise_tracker', ['exercise_types', 'duration_or_reps', 'frequency']],
    ['habit_tracker', ['habits', 'tracking_frequency', 'reminder_times']],
    ['expense_tracker', ['currency', 'categories', 'budget']],
    ['timer', ['duration', 'intervals', 'notification_type']],
    ['reminder', ['reminder_times', 'frequency', 'notification_style']],
    ['sports_app', ['app_function', 'what_to_track', 'data_types']],
    ['generic_app', ['app_function', 'main_features']],
  ]);

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await KnowledgeBase.initialize();
    this.initialized = true;
    console.log('[AmbiguityDetector] Initialized');
  }

  // ==========================================================================
  // MAIN ANALYSIS PIPELINE
  // ==========================================================================

  async analyze(input: string): Promise<AmbiguityAnalysis> {
    await this.initialize();

    // Get reasoning context for semantic analysis
    const reasoningContext = await SymbolicReasoner.reason(input);

    // Detect various types of ambiguity
    const ambiguities: Ambiguity[] = [];

    // 1. Lexical ambiguity (words with multiple meanings)
    ambiguities.push(...this.detectLexicalAmbiguity(input));

    // 2. Missing required context
    ambiguities.push(...this.detectMissingContext(input, reasoningContext));

    // 3. Conflicting requirements
    ambiguities.push(...this.detectConflicts(input, reasoningContext));

    // 4. Vague quantifiers and modifiers
    ambiguities.push(...this.detectVagueModifiers(input));

    // 5. Scope ambiguity
    ambiguities.push(...this.detectScopeAmbiguity(input));

    // Calculate overall entropy score
    const entropyScore = this.calculateEntropyScore(input, ambiguities);

    // Generate clarification questions for unresolvable ambiguities
    const clarificationQuestions = this.generateClarificationQuestions(ambiguities, reasoningContext);

    // Auto-resolve what we can
    const autoResolutions = await this.autoResolve(ambiguities, reasoningContext);

    // Filter out resolved ambiguities
    const unresolvedAmbiguities = ambiguities.filter(a => 
      !autoResolutions.some(r => r.ambiguityText === a.text && r.confidence > 0.8)
    );

    const isAmbiguous = unresolvedAmbiguities.length > 0 || entropyScore > 0.4;

    return {
      isAmbiguous,
      overallScore: entropyScore,
      ambiguities: unresolvedAmbiguities,
      clarificationQuestions,
      autoResolutions,
      confidence: 1 - entropyScore,
    };
  }

  // ==========================================================================
  // LEXICAL AMBIGUITY DETECTION
  // ==========================================================================

  private detectLexicalAmbiguity(input: string): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];
    const words = input.toLowerCase().split(/\s+/);

    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w]/g, '');
      const meanings = this.ambiguousTerms.get(word);

      if (meanings && meanings.length > 1) {
        // Check if context disambiguates
        const contextClues = this.getContextClues(words, i);
        const likelyMeaning = this.inferMeaningFromContext(word, meanings, contextClues);

        if (!likelyMeaning) {
          ambiguities.push({
            type: 'lexical',
            text: word,
            position: i,
            severity: 'medium',
            description: `"${word}" could mean different things`,
            possibleInterpretations: meanings,
          });
        }
      }
    }

    return ambiguities;
  }

  private getContextClues(words: string[], position: number): string[] {
    const clues: string[] = [];
    
    // Get surrounding words (window of 3)
    for (let i = Math.max(0, position - 3); i < Math.min(words.length, position + 4); i++) {
      if (i !== position) {
        clues.push(words[i]);
      }
    }

    return clues;
  }

  private inferMeaningFromContext(word: string, meanings: string[], contextClues: string[]): string | null {
    // Domain-specific context inference
    const contextIndicators: Record<string, Record<string, string>> = {
      'track': {
        'water': 'monitor/record data',
        'exercise': 'monitor/record data',
        'habit': 'monitor/record data',
        'music': 'audio track',
        'run': 'race track',
      },
      'log': {
        'water': 'record/journal',
        'food': 'record/journal',
        'exercise': 'record/journal',
        'math': 'logarithm',
      },
      'goal': {
        'daily': 'target value',
        'track': 'target value',
        'score': 'sports goal',
        'hockey': 'sports goal',
        'soccer': 'sports goal',
      },
      'time': {
        'reminder': 'clock time',
        'notification': 'clock time',
        'how long': 'duration',
        'duration': 'duration',
        'every': 'instance/occurrence',
      },
    };

    const indicators = contextIndicators[word];
    if (!indicators) return null;

    for (const clue of contextClues) {
      for (const [indicator, meaning] of Object.entries(indicators)) {
        if (clue.includes(indicator) || indicator.includes(clue)) {
          if (meanings.includes(meaning)) {
            return meaning;
          }
        }
      }
    }

    return null;
  }

  // ==========================================================================
  // MISSING CONTEXT DETECTION
  // ==========================================================================

  private detectMissingContext(input: string, context: ReasoningContext): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];
    const normalizedInput = input.toLowerCase();

    // Determine app type and check for required context
    const entries = Array.from(this.requiredContext.entries());
    for (const [appType, required] of entries) {
      if (this.matchesAppType(normalizedInput, appType)) {
        for (const req of required) {
          if (!this.hasRequiredInfo(normalizedInput, req, context)) {
            ambiguities.push({
              type: 'missing',
              text: req,
              position: -1,
              severity: this.getRequirementSeverity(req),
              description: this.getMissingDescription(req, appType),
              possibleInterpretations: this.getDefaultOptions(req),
            });
          }
        }
      }
    }

    return ambiguities;
  }

  private matchesAppType(input: string, appType: string): boolean {
    const patterns: Record<string, RegExp> = {
      'water_tracker': /water|hydrat|drink|fluid/i,
      'medication_tracker': /medic|pill|drug|prescription/i,
      'exercise_tracker': /exercise|workout|gym|fitness/i,
      'habit_tracker': /habit|daily|routine|streak/i,
      'expense_tracker': /expense|spending|budget|money/i,
      'timer': /timer|countdown|stopwatch|pomodoro/i,
      'reminder': /remind|alert|notif/i,
      'sports_app': /hockey|basketball|football|soccer|tennis|golf|baseball|sports?|game|match|team|player/i,
      'generic_app': /.+/, // Matches everything as fallback
    };

    return patterns[appType]?.test(input) || false;
  }

  private hasRequiredInfo(input: string, requirement: string, context: ReasoningContext): boolean {
    const patterns: Record<string, RegExp> = {
      'unit_preference': /ml|oz|ounce|cup|liter|litre|gallon/i,
      'daily_goal': /\d+\s*(ml|oz|cup|liter|l\b|gallon)/i,
      'reminder_times': /\d{1,2}(:\d{2})?\s*(am|pm)|every\s*\d+\s*(hour|minute)|hourly|daily/i,
      'medications': /\w+\s*(pill|tablet|mg|medication)/i,
      'dosage': /\d+\s*(mg|ml|tablet|pill)/i,
      'schedule': /(morning|afternoon|evening|night|daily|weekly|\d+\s*times)/i,
      'exercise_types': /(run|walk|swim|bike|lift|cardio|strength|yoga)/i,
      'duration_or_reps': /\d+\s*(min|minute|hour|rep|set)/i,
      'frequency': /(daily|weekly|times?\s*per|every)/i,
      'habits': /\w+\s*(habit|routine|daily)/i,
      'tracking_frequency': /(daily|weekly|monthly)/i,
      'currency': /(\$|€|£|usd|eur|gbp)/i,
      'categories': /(food|transport|entertainment|bills|shopping)/i,
      'budget': /budget|\d+\s*(per|a)\s*(day|week|month)/i,
      'duration': /\d+\s*(sec|min|hour)/i,
      'intervals': /\d+\s*(time|interval|break)/i,
      'notification_type': /(sound|vibrat|silent|alert)/i,
      'notification_style': /(persistent|dismiss|snooze)/i,
      // Sports and generic app requirements - detect if user specified WHAT the app should DO
      'app_function': /(track|log|record|manage|schedule|score|stat|timer|count|monitor|analyze|remind|calculate|display|show|list|create|edit|save)/i,
      'what_to_track': /(score|stat|game|match|player|team|time|shift|goal|point|period|inning|quarter|half|set|round)/i,
      'data_types': /(score|stat|time|date|name|number|result|history|record)/i,
      'main_features': /(track|log|record|manage|schedule|remind|calculate|timer|countdown|list|display|chart|graph|history)/i,
    };

    return patterns[requirement]?.test(input) || false;
  }

  private getRequirementSeverity(requirement: string): 'low' | 'medium' | 'high' {
    const highSeverity = ['unit_preference', 'daily_goal', 'medications', 'dosage', 'app_function', 'main_features'];
    const mediumSeverity = ['reminder_times', 'schedule', 'duration', 'currency', 'what_to_track', 'data_types'];
    
    if (highSeverity.includes(requirement)) return 'high';
    if (mediumSeverity.includes(requirement)) return 'medium';
    return 'low';
  }

  private getMissingDescription(requirement: string, appType: string): string {
    const descriptions: Record<string, string> = {
      'unit_preference': 'What units should be used? (ml, oz, cups, etc.)',
      'daily_goal': 'What is the target daily amount?',
      'reminder_times': 'When should reminders be sent?',
      'medications': 'Which medications need to be tracked?',
      'dosage': 'What are the dosage amounts?',
      'schedule': 'How often should medications be taken?',
      'exercise_types': 'What types of exercises will be tracked?',
      'duration_or_reps': 'Track by duration or repetitions?',
      'frequency': 'How often will you exercise?',
      'habits': 'Which habits do you want to track?',
      'tracking_frequency': 'How often should habits be tracked?',
      'currency': 'What currency should be used?',
      'categories': 'What expense categories are needed?',
      'budget': 'Is there a budget limit to track?',
      'duration': 'What is the timer duration?',
      'intervals': 'Are there work/break intervals?',
      'notification_type': 'How should notifications sound?',
      'notification_style': 'Should notifications be persistent?',
      // Sports and generic app descriptions
      'app_function': 'What should this app do? (track scores, log games, manage teams, time shifts, etc.)',
      'what_to_track': 'What specific things do you want to track? (scores, stats, player time, games, etc.)',
      'data_types': 'What kind of data should be stored? (scores, times, names, dates, etc.)',
      'main_features': 'What are the main features you need? (track, log, remind, calculate, display, etc.)',
    };

    return descriptions[requirement] || `Missing: ${requirement}`;
  }

  private getDefaultOptions(requirement: string): string[] {
    const defaults: Record<string, string[]> = {
      'unit_preference': ['ml (metric)', 'oz (US)', 'cups'],
      'daily_goal': ['2000ml (8 glasses)', '2500ml', '3000ml'],
      'reminder_times': ['Every hour', 'Custom times', 'Morning/Noon/Evening'],
      'frequency': ['Daily', 'Weekly', 'Custom'],
      'currency': ['USD ($)', 'EUR (€)', 'GBP (£)'],
      'notification_type': ['Sound + Vibration', 'Vibration only', 'Silent'],
      // Sports and generic app defaults
      'app_function': ['Track scores/stats', 'Log games/matches', 'Time players/shifts', 'Manage team roster', 'View history/standings'],
      'what_to_track': ['Game scores', 'Player statistics', 'Shift/play time', 'Team standings', 'Match history'],
      'data_types': ['Scores and results', 'Time and duration', 'Player names', 'Dates and schedules'],
      'main_features': ['Score tracking', 'Game logging', 'Statistics', 'History view', 'Timer/stopwatch'],
    };

    return defaults[requirement] || [];
  }

  // ==========================================================================
  // CONFLICT DETECTION
  // ==========================================================================

  private detectConflicts(input: string, context: ReasoningContext): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];
    const normalizedInput = input.toLowerCase();

    // Check for conflicting requirements
    const conflicts: [RegExp, RegExp, string][] = [
      [/simple|minimal|basic/, /comprehensive|full|complete|all features/, 'Simplicity vs comprehensiveness'],
      [/offline/, /sync|cloud|backup online/, 'Offline vs cloud sync'],
      [/private|local only/, /share|social|export/, 'Privacy vs sharing'],
      [/no notification/, /remind|alert|notify/, 'Notification preferences'],
    ];

    for (const [pattern1, pattern2, description] of conflicts) {
      if (pattern1.test(normalizedInput) && pattern2.test(normalizedInput)) {
        ambiguities.push({
          type: 'conflicting',
          text: description,
          position: -1,
          severity: 'high',
          description: `Conflicting requirements detected: ${description}`,
          possibleInterpretations: ['Prioritize first requirement', 'Prioritize second requirement', 'Balance both'],
        });
      }
    }

    return ambiguities;
  }

  // ==========================================================================
  // VAGUE MODIFIER DETECTION
  // ==========================================================================

  private detectVagueModifiers(input: string): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];
    
    const vaguePatterns: [RegExp, string, string[]][] = [
      [/\bsome\b/i, 'Vague quantity "some"', ['a few (2-3)', 'several (4-6)', 'many (7+)']],
      [/\bfew\b/i, 'Vague quantity "few"', ['2-3', '3-5', '5-10']],
      [/\bmany\b/i, 'Vague quantity "many"', ['5-10', '10-20', '20+']],
      [/\boften\b/i, 'Vague frequency "often"', ['hourly', 'every few hours', 'several times a day']],
      [/\bsometimes\b/i, 'Vague frequency "sometimes"', ['occasionally', 'a few times a week', 'when needed']],
      [/\bregularly\b/i, 'Vague frequency "regularly"', ['daily', 'every other day', 'weekly']],
      [/\blarge\b/i, 'Vague size "large"', ['500ml', '750ml', '1000ml']],
      [/\bsmall\b/i, 'Vague size "small"', ['100ml', '200ml', '250ml']],
      [/\bquickly\b/i, 'Vague timing "quickly"', ['immediately', 'within seconds', 'within minutes']],
      [/\bsoon\b/i, 'Vague timing "soon"', ['in a few minutes', 'within an hour', 'today']],
    ];

    for (const [pattern, description, options] of vaguePatterns) {
      const match = input.match(pattern);
      if (match) {
        ambiguities.push({
          type: 'scope',
          text: match[0],
          position: match.index || 0,
          severity: 'low',
          description,
          possibleInterpretations: options,
        });
      }
    }

    return ambiguities;
  }

  // ==========================================================================
  // SCOPE AMBIGUITY DETECTION
  // ==========================================================================

  private detectScopeAmbiguity(input: string): Ambiguity[] {
    const ambiguities: Ambiguity[] = [];

    // Detect ambiguous "and/or" scope
    const andOrPattern = /(\w+)\s+and\s+(\w+)\s+(track|remind|notify|log)/i;
    const match = input.match(andOrPattern);
    if (match) {
      ambiguities.push({
        type: 'scope',
        text: match[0],
        position: match.index || 0,
        severity: 'medium',
        description: `Does "${match[3]}" apply to both "${match[1]}" and "${match[2]}"?`,
        possibleInterpretations: [
          `${match[3]} both ${match[1]} and ${match[2]}`,
          `${match[3]} only ${match[2]}`,
        ],
      });
    }

    return ambiguities;
  }

  // ==========================================================================
  // ENTROPY CALCULATION
  // ==========================================================================

  private calculateEntropyScore(input: string, ambiguities: Ambiguity[]): number {
    // Base entropy from input length (shorter = more ambiguous)
    const lengthFactor = Math.max(0, 1 - (input.length / 200));

    // Entropy from ambiguity count and severity
    const severityWeights = { low: 0.1, medium: 0.3, high: 0.5 };
    const ambiguityScore = ambiguities.reduce((sum, a) => 
      sum + severityWeights[a.severity], 0
    ) / Math.max(1, ambiguities.length + 1);

    // Word entropy (unique words / total words)
    const words = input.toLowerCase().split(/\s+/);
    const uniqueWords = new Set(words);
    const wordEntropy = 1 - (uniqueWords.size / Math.max(1, words.length));

    // Combined score (weighted average)
    const score = (lengthFactor * 0.2) + (ambiguityScore * 0.5) + (wordEntropy * 0.3);

    return Math.min(1, Math.max(0, score));
  }

  // ==========================================================================
  // CLARIFICATION QUESTION GENERATION
  // ==========================================================================

  private generateClarificationQuestions(
    ambiguities: Ambiguity[],
    context: ReasoningContext
  ): ClarificationQuestion[] {
    const questions: ClarificationQuestion[] = [];

    for (const ambiguity of ambiguities) {
      const question = this.ambiguityToQuestion(ambiguity, context);
      if (question) {
        questions.push(question);
      }
    }

    // Sort by importance (required first, then by severity)
    return questions.sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      return 0;
    });
  }

  private ambiguityToQuestion(ambiguity: Ambiguity, context: ReasoningContext): ClarificationQuestion | null {
    const questionGenerators: Record<AmbiguityType, () => ClarificationQuestion | null> = {
      'lexical': () => ({
        id: `clarify_${ambiguity.text}_${Date.now()}`,
        question: `What do you mean by "${ambiguity.text}"?`,
        type: 'single_choice',
        options: ambiguity.possibleInterpretations.map(interp => ({
          value: interp,
          label: interp,
        })),
        required: ambiguity.severity === 'high',
        relatedAmbiguity: ambiguity.text,
      }),

      'missing': () => this.generateMissingInfoQuestion(ambiguity, context),

      'conflicting': () => ({
        id: `resolve_conflict_${Date.now()}`,
        question: ambiguity.description,
        type: 'single_choice',
        options: ambiguity.possibleInterpretations.map(interp => ({
          value: interp,
          label: interp,
        })),
        required: true,
        relatedAmbiguity: ambiguity.text,
      }),

      'scope': () => ambiguity.severity !== 'low' ? ({
        id: `clarify_scope_${Date.now()}`,
        question: ambiguity.description,
        type: 'single_choice',
        options: ambiguity.possibleInterpretations.map(interp => ({
          value: interp,
          label: interp,
        })),
        required: false,
        relatedAmbiguity: ambiguity.text,
      }) : null,

      'syntactic': () => null,
      'semantic': () => null,
      'referential': () => null,
    };

    const generator = questionGenerators[ambiguity.type];
    return generator ? generator() : null;
  }

  private generateMissingInfoQuestion(ambiguity: Ambiguity, context: ReasoningContext): ClarificationQuestion {
    const requirement = ambiguity.text;

    // Special handling for common requirements
    const specialQuestions: Record<string, Partial<ClarificationQuestion>> = {
      'unit_preference': {
        question: 'Which unit would you prefer?',
        type: 'single_choice',
        options: [
          { value: 'ml', label: 'Milliliters (ml)', description: 'Metric system' },
          { value: 'oz', label: 'Fluid ounces (oz)', description: 'US system' },
          { value: 'cups', label: 'Cups', description: '1 cup ≈ 237ml' },
          { value: 'liters', label: 'Liters (L)', description: '1L = 1000ml' },
        ],
        defaultValue: 'ml',
      },
      'daily_goal': {
        question: 'What is your daily target?',
        type: 'number',
        placeholder: 'e.g., 2000',
        validation: { type: 'range', min: 500, max: 10000, message: 'Enter a value between 500-10000' },
        defaultValue: '2000',
      },
      'reminder_times': {
        question: 'How would you like to be reminded?',
        type: 'single_choice',
        options: [
          { value: 'hourly_6_22', label: 'Every hour (6 AM - 10 PM)', description: 'Recommended for hydration' },
          { value: 'hourly_8_20', label: 'Every hour (8 AM - 8 PM)', description: 'Standard working hours' },
          { value: 'custom', label: 'Custom times', description: 'Set specific reminder times' },
          { value: 'none', label: 'No reminders', description: 'Track manually' },
        ],
      },
      'currency': {
        question: 'Which currency should be used?',
        type: 'single_choice',
        options: [
          { value: 'USD', label: '$ US Dollar', icon: '🇺🇸' },
          { value: 'EUR', label: '€ Euro', icon: '🇪🇺' },
          { value: 'GBP', label: '£ British Pound', icon: '🇬🇧' },
          { value: 'JPY', label: '¥ Japanese Yen', icon: '🇯🇵' },
          { value: 'other', label: 'Other', description: 'Specify currency' },
        ],
        defaultValue: 'USD',
      },
    };

    const special = specialQuestions[requirement];

    return {
      id: `missing_${requirement}_${Date.now()}`,
      question: special?.question || ambiguity.description,
      type: (special?.type as any) || 'text',
      options: special?.options,
      required: ambiguity.severity === 'high',
      relatedAmbiguity: ambiguity.text,
      defaultValue: special?.defaultValue,
      placeholder: special?.placeholder,
      validation: special?.validation,
    };
  }

  // ==========================================================================
  // AUTO-RESOLUTION
  // ==========================================================================

  private async autoResolve(
    ambiguities: Ambiguity[],
    context: ReasoningContext
  ): Promise<AutoResolution[]> {
    const resolutions: AutoResolution[] = [];
    const userContext = await KnowledgeBase.getUserContext();

    for (const ambiguity of ambiguities) {
      // Try to resolve from user history
      const historyResolution = this.resolveFromHistory(ambiguity, userContext);
      if (historyResolution) {
        resolutions.push(historyResolution);
        continue;
      }

      // Try to resolve from domain defaults
      const domainResolution = this.resolveFromDomainDefaults(ambiguity, context);
      if (domainResolution) {
        resolutions.push(domainResolution);
        continue;
      }

      // Try to resolve from context clues
      const contextResolution = this.resolveFromContext(ambiguity, context);
      if (contextResolution) {
        resolutions.push(contextResolution);
      }
    }

    return resolutions;
  }

  private resolveFromHistory(ambiguity: Ambiguity, userContext: UserContext): AutoResolution | null {
    // Check if user has previously specified this preference
    const preference = userContext.preferences.get(ambiguity.text);
    if (preference) {
      return {
        ambiguityText: ambiguity.text,
        resolvedTo: String(preference),
        confidence: 0.9,
        source: 'user_history',
      };
    }

    // Check recent sessions for similar choices
    const recentSessions = userContext.sessionHistory.slice(-20);
    for (const session of recentSessions) {
      if (session.input.toLowerCase().includes(ambiguity.text.toLowerCase())) {
        // Found similar context in history
        // In a full implementation, we'd extract the resolution from the session
      }
    }

    return null;
  }

  private resolveFromDomainDefaults(ambiguity: Ambiguity, context: ReasoningContext): AutoResolution | null {
    if (!context.domain) return null;

    // Domain-specific defaults
    const domainDefaults: Record<string, Record<string, string>> = {
      'health': {
        'unit_preference': 'ml',
        'daily_goal': '2000ml',
        'reminder_times': 'hourly_6_22',
      },
      'productivity': {
        'duration': '25 minutes',
        'intervals': 'pomodoro',
      },
      'finance': {
        'currency': 'USD',
      },
    };

    const defaults = domainDefaults[context.domain];
    if (defaults && defaults[ambiguity.text]) {
      return {
        ambiguityText: ambiguity.text,
        resolvedTo: defaults[ambiguity.text],
        confidence: 0.7,
        source: 'domain_default',
      };
    }

    return null;
  }

  private resolveFromContext(ambiguity: Ambiguity, context: ReasoningContext): AutoResolution | null {
    // Try to infer from detected concepts
    for (const concept of context.detectedConcepts) {
      if (ambiguity.possibleInterpretations.some(i => 
        i.toLowerCase().includes(concept.concept.toLowerCase())
      )) {
        const matchedInterp = ambiguity.possibleInterpretations.find(i =>
          i.toLowerCase().includes(concept.concept.toLowerCase())
        );
        if (matchedInterp) {
          return {
            ambiguityText: ambiguity.text,
            resolvedTo: matchedInterp,
            confidence: concept.confidence * 0.8,
            source: 'context',
          };
        }
      }
    }

    return null;
  }
}

// Singleton instance
export const AmbiguityDetector = new AmbiguityDetectorImpl();
