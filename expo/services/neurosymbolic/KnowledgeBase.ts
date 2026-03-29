/**
 * KnowledgeBase - Persistent symbolic knowledge storage with logical facts and rules
 * Implements a first-order logic knowledge representation system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Fact {
  id: string;
  predicate: string;
  arguments: string[];
  confidence: 1; // Facts are always 1 (certain) in symbolic systems
  source: 'user' | 'inferred' | 'domain' | 'system';
  timestamp: number;
  domain?: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  conditions: Condition[];
  conclusion: Conclusion;
  priority: number; // Higher = evaluated first
  domain?: string;
}

export interface Condition {
  predicate: string;
  arguments: (string | Variable)[];
  negated?: boolean;
}

export interface Conclusion {
  predicate: string;
  arguments: (string | Variable)[];
  action?: 'assert' | 'retract' | 'modify';
}

export interface Variable {
  name: string;
  type: 'variable';
  constraints?: string[];
}

export interface Constraint {
  id: string;
  name: string;
  type: 'required' | 'prohibited' | 'preference';
  domain: string;
  condition: string; // Logical expression
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface DomainKnowledge {
  domain: string;
  facts: Fact[];
  rules: Rule[];
  constraints: Constraint[];
  vocabulary: Map<string, string[]>; // term -> synonyms
  templates: PromptTemplate[];
}

export interface PromptTemplate {
  id: string;
  domain: string;
  pattern: string; // Regex or keyword pattern
  template: string;
  requiredFields: string[];
  optionalFields: string[];
  priority: number;
}

export interface UserContext {
  userId: string;
  sessionHistory: SessionEntry[];
  preferences: Map<string, any>;
  createdOracles: OracleMetadata[];
  domainExpertise: Map<string, number>; // domain -> familiarity score
}

export interface SessionEntry {
  timestamp: number;
  input: string;
  interpretedIntent: string;
  generatedPrompt: string;
  oracleId?: string;
  feedback?: 'positive' | 'negative' | 'neutral';
}

export interface OracleMetadata {
  id: string;
  name: string;
  domain: string;
  features: string[];
  createdAt: number;
  usageCount: number;
  lastUsed: number;
}

// ============================================================================
// KNOWLEDGE BASE CLASS
// ============================================================================

class KnowledgeBaseImpl {
  private facts: Map<string, Fact> = new Map();
  private rules: Map<string, Rule> = new Map();
  private constraints: Map<string, Constraint> = new Map();
  private domains: Map<string, DomainKnowledge> = new Map();
  private userContext: UserContext | null = null;
  private initialized = false;

  private readonly STORAGE_KEY = '@oracle_knowledge_base';
  private readonly USER_CONTEXT_KEY = '@oracle_user_context';

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Load persisted knowledge
      await this.loadFromStorage();
      
      // Initialize built-in domain knowledge
      this.initializeHealthDomain();
      this.initializeProductivityDomain();
      this.initializeFinanceDomain();
      this.initializeSportsDomain();
      this.initializeEducationDomain();
      this.initializeMobilePlatformConstraints();
      
      // Initialize inference rules
      this.initializeInferenceRules();
      
      this.initialized = true;
      console.log('[KnowledgeBase] Initialized with', this.facts.size, 'facts,', this.rules.size, 'rules');
    } catch (e) {
      console.error('[KnowledgeBase] Initialization failed:', e);
      this.initialized = true; // Continue with defaults
    }
  }

  // ==========================================================================
  // DOMAIN KNOWLEDGE INITIALIZATION
  // ==========================================================================

  private initializeHealthDomain(): void {
    const healthDomain: DomainKnowledge = {
      domain: 'health',
      facts: [
        // Water intake facts
        { id: 'health_water_daily', predicate: 'recommended_daily', arguments: ['water', '2000', 'ml'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'health_water_daily_oz', predicate: 'recommended_daily', arguments: ['water', '64', 'oz'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'health_water_hourly', predicate: 'recommended_interval', arguments: ['water', '1', 'hour'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'health_water_wakeup', predicate: 'recommended_time_range', arguments: ['water_reminder', '06:00', '22:00'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        
        // Unit conversions
        { id: 'unit_ml_oz', predicate: 'unit_conversion', arguments: ['ml', 'oz', '0.033814'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'unit_l_ml', predicate: 'unit_conversion', arguments: ['l', 'ml', '1000'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'unit_cup_ml', predicate: 'unit_conversion', arguments: ['cup', 'ml', '237'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        
        // Medication facts
        { id: 'health_med_reminder', predicate: 'requires_feature', arguments: ['medication_tracker', 'notification', 'critical'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'health_med_timing', predicate: 'requires_feature', arguments: ['medication_tracker', 'precise_timing', 'required'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        
        // Exercise facts  
        { id: 'health_exercise_weekly', predicate: 'recommended_weekly', arguments: ['exercise', '150', 'minutes'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'health_steps_daily', predicate: 'recommended_daily', arguments: ['steps', '10000', 'count'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        
        // Sleep facts
        { id: 'health_sleep_duration', predicate: 'recommended_daily', arguments: ['sleep', '8', 'hours'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
        { id: 'health_sleep_consistency', predicate: 'best_practice', arguments: ['sleep', 'consistent_schedule', 'important'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'health' },
      ],
      rules: [
        {
          id: 'health_rule_hydration_reminder',
          name: 'Hydration Reminder Requirements',
          description: 'Water trackers should include reminders and progress tracking',
          conditions: [
            { predicate: 'intent_type', arguments: [{ name: 'X', type: 'variable' }] },
            { predicate: 'contains_concept', arguments: [{ name: 'X', type: 'variable' }, 'water'] },
          ],
          conclusion: { predicate: 'requires_feature', arguments: ['result', 'hourly_reminder', 'progress_visualization'] },
          priority: 10,
          domain: 'health'
        },
        {
          id: 'health_rule_medication_safety',
          name: 'Medication Safety Requirements',
          description: 'Medication trackers must have reliable notifications',
          conditions: [
            { predicate: 'contains_concept', arguments: [{ name: 'X', type: 'variable' }, 'medication'] },
          ],
          conclusion: { predicate: 'requires_feature', arguments: ['result', 'persistent_notification', 'dose_logging'] },
          priority: 20,
          domain: 'health'
        },
      ],
      constraints: [
        {
          id: 'health_constraint_hipaa_lite',
          name: 'Health Data Privacy',
          type: 'required',
          domain: 'health',
          condition: 'stores_health_data -> local_storage_only',
          message: 'Health data should be stored locally for privacy',
          severity: 'warning'
        },
        {
          id: 'health_constraint_units',
          name: 'Unit Specification Required',
          type: 'required',
          domain: 'health',
          condition: 'tracks_quantity -> has_unit_specification',
          message: 'Quantities must have explicit units (ml, oz, cups, etc.)',
          severity: 'error'
        },
      ],
      vocabulary: new Map([
        ['water', ['hydration', 'drink', 'fluid', 'h2o', 'agua', 'beverage']],
        ['medication', ['medicine', 'pill', 'drug', 'prescription', 'med', 'dose', 'rx']],
        ['exercise', ['workout', 'fitness', 'training', 'gym', 'cardio', 'physical activity']],
        ['sleep', ['rest', 'bedtime', 'nap', 'slumber', 'snooze']],
        ['calories', ['kcal', 'energy', 'caloric intake', 'food energy']],
        ['weight', ['mass', 'body weight', 'lbs', 'kg', 'pounds', 'kilograms']],
      ]),
      templates: [
        {
          id: 'health_water_tracker',
          domain: 'health',
          pattern: 'water|hydration|drink.*track',
          template: 'A comprehensive water intake tracker with: daily goal of {dailyGoal} {unit}, quick-add buttons for common amounts ({quickAmounts}), hourly reminders from {startTime} to {endTime}, circular progress visualization showing percentage of daily goal, monthly calendar view with color-coded days (green=goal met, yellow=partial, red=missed), detailed daily log with timestamps, weekly/monthly statistics with bar charts, customizable reminder sounds, and local data persistence.',
          requiredFields: ['dailyGoal', 'unit'],
          optionalFields: ['startTime', 'endTime', 'quickAmounts'],
          priority: 10
        },
        {
          id: 'health_medication_tracker',
          domain: 'health',
          pattern: 'medication|medicine|pill|prescription',
          template: 'A medication management app with: medication list showing name, dosage, and schedule for each; persistent notification system with snooze option; dose logging with timestamp and notes; refill reminders based on pill count; medication interaction warnings; history view showing adherence percentage; export functionality for doctor visits; and secure local storage.',
          requiredFields: ['medications'],
          optionalFields: ['interactionCheck', 'refillTracking'],
          priority: 10
        },
      ]
    };

    this.domains.set('health', healthDomain);
    healthDomain.facts.forEach(f => this.facts.set(f.id, f));
    healthDomain.rules.forEach(r => this.rules.set(r.id, r));
    healthDomain.constraints.forEach(c => this.constraints.set(c.id, c));
  }

  private initializeProductivityDomain(): void {
    const productivityDomain: DomainKnowledge = {
      domain: 'productivity',
      facts: [
        { id: 'prod_pomodoro_work', predicate: 'standard_duration', arguments: ['pomodoro_work', '25', 'minutes'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'productivity' },
        { id: 'prod_pomodoro_break', predicate: 'standard_duration', arguments: ['pomodoro_break', '5', 'minutes'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'productivity' },
        { id: 'prod_pomodoro_long_break', predicate: 'standard_duration', arguments: ['pomodoro_long_break', '15', 'minutes'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'productivity' },
        { id: 'prod_task_priority', predicate: 'priority_levels', arguments: ['task', 'high', 'medium', 'low'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'productivity' },
      ],
      rules: [
        {
          id: 'prod_rule_timer_haptics',
          name: 'Timer Haptic Feedback',
          description: 'Timers should provide haptic feedback on completion',
          conditions: [
            { predicate: 'contains_concept', arguments: [{ name: 'X', type: 'variable' }, 'timer'] },
          ],
          conclusion: { predicate: 'requires_feature', arguments: ['result', 'haptic_feedback', 'sound_notification'] },
          priority: 10,
          domain: 'productivity'
        },
      ],
      constraints: [
        {
          id: 'prod_constraint_offline',
          name: 'Offline Capability',
          type: 'required',
          domain: 'productivity',
          condition: 'is_productivity_app -> works_offline',
          message: 'Productivity apps must work without internet connection',
          severity: 'warning'
        },
      ],
      vocabulary: new Map([
        ['task', ['todo', 'item', 'action', 'to-do', 'checklist item']],
        ['timer', ['countdown', 'stopwatch', 'clock', 'pomodoro']],
        ['reminder', ['alert', 'notification', 'alarm', 'prompt']],
        ['schedule', ['calendar', 'planner', 'agenda', 'timetable']],
        ['habit', ['routine', 'daily practice', 'recurring task']],
      ]),
      templates: [
        {
          id: 'prod_pomodoro_timer',
          domain: 'productivity',
          pattern: 'pomodoro|focus.*timer|work.*timer',
          template: 'A Pomodoro timer with: configurable work sessions (default {workDuration} minutes), short breaks ({shortBreak} minutes), long breaks ({longBreak} minutes) after {sessionsBeforeLongBreak} sessions, visual countdown with circular progress, session counter, daily/weekly statistics, customizable sounds and haptics, and pause/resume functionality.',
          requiredFields: [],
          optionalFields: ['workDuration', 'shortBreak', 'longBreak', 'sessionsBeforeLongBreak'],
          priority: 10
        },
        {
          id: 'prod_habit_tracker',
          domain: 'productivity',
          pattern: 'habit|daily.*track|streak',
          template: 'A habit tracking app with: habit list with customizable icons and colors, daily check-off interface, streak counting and visualization, weekly/monthly calendar view, statistics showing completion rates, motivational messages on milestones, reminder notifications at custom times, and local data persistence.',
          requiredFields: [],
          optionalFields: ['habits', 'reminderTimes'],
          priority: 10
        },
      ]
    };

    this.domains.set('productivity', productivityDomain);
    productivityDomain.facts.forEach(f => this.facts.set(f.id, f));
    productivityDomain.rules.forEach(r => this.rules.set(r.id, r));
    productivityDomain.constraints.forEach(c => this.constraints.set(c.id, c));
  }

  private initializeFinanceDomain(): void {
    const financeDomain: DomainKnowledge = {
      domain: 'finance',
      facts: [
        { id: 'fin_budget_rule', predicate: 'best_practice', arguments: ['budgeting', '50_30_20_rule', 'recommended'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'finance' },
        { id: 'fin_savings_rate', predicate: 'recommended_minimum', arguments: ['savings_rate', '20', 'percent'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'finance' },
      ],
      rules: [],
      constraints: [
        {
          id: 'fin_constraint_security',
          name: 'Financial Data Security',
          type: 'required',
          domain: 'finance',
          condition: 'handles_financial_data -> local_storage_encrypted',
          message: 'Financial data must be stored locally and securely',
          severity: 'error'
        },
      ],
      vocabulary: new Map([
        ['expense', ['spending', 'cost', 'purchase', 'transaction', 'payment']],
        ['income', ['earnings', 'salary', 'revenue', 'money in']],
        ['budget', ['spending plan', 'financial plan', 'allocation']],
        ['savings', ['reserve', 'nest egg', 'emergency fund']],
      ]),
      templates: [
        {
          id: 'fin_expense_tracker',
          domain: 'finance',
          pattern: 'expense|spending|budget|money.*track',
          template: 'An expense tracking app with: quick expense entry with amount, category, and notes; customizable categories with icons; daily/weekly/monthly spending summaries; budget setting per category with visual progress bars; pie chart breakdown by category; transaction history with search and filter; export to CSV; and secure local storage.',
          requiredFields: [],
          optionalFields: ['categories', 'budgetLimits', 'currency'],
          priority: 10
        },
      ]
    };

    this.domains.set('finance', financeDomain);
    financeDomain.facts.forEach(f => this.facts.set(f.id, f));
    financeDomain.constraints.forEach(c => this.constraints.set(c.id, c));
  }

  private initializeSportsDomain(): void {
    const sportsDomain: DomainKnowledge = {
      domain: 'sports',
      facts: [
        { id: 'sport_hockey_periods', predicate: 'game_structure', arguments: ['hockey', '3', 'periods'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'sports' },
        { id: 'sport_hockey_period_length', predicate: 'period_duration', arguments: ['hockey', '20', 'minutes'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'sports' },
        { id: 'sport_basketball_quarters', predicate: 'game_structure', arguments: ['basketball', '4', 'quarters'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'sports' },
        { id: 'sport_soccer_halves', predicate: 'game_structure', arguments: ['soccer', '2', 'halves'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'sports' },
      ],
      rules: [
        {
          id: 'sport_rule_timer_required',
          name: 'Sports Timer Requirement',
          description: 'Sports tracking apps should include game timers',
          conditions: [
            { predicate: 'domain', arguments: ['sports'] },
            { predicate: 'contains_concept', arguments: [{ name: 'X', type: 'variable' }, 'game'] },
          ],
          conclusion: { predicate: 'requires_feature', arguments: ['result', 'game_timer', 'period_tracking'] },
          priority: 10,
          domain: 'sports'
        },
      ],
      constraints: [],
      vocabulary: new Map([
        ['hockey', ['ice hockey', 'puck', 'rink']],
        ['shift', ['ice time', 'playing time', 'on-ice time']],
        ['period', ['quarter', 'half', 'inning', 'set']],
        ['score', ['points', 'goals', 'runs', 'tally']],
      ]),
      templates: [
        {
          id: 'sport_shift_tracker',
          domain: 'sports',
          pattern: 'hockey.*shift|shift.*track|ice.*time',
          template: 'A hockey shift tracker with: active shift timer with large display, shift history per period, player rotation management, average shift length statistics, period-by-period breakdown, game summary with total ice time, haptic feedback on shift start/end, and persistent game data.',
          requiredFields: [],
          optionalFields: ['players', 'targetShiftLength'],
          priority: 10
        },
      ]
    };

    this.domains.set('sports', sportsDomain);
    sportsDomain.facts.forEach(f => this.facts.set(f.id, f));
    sportsDomain.rules.forEach(r => this.rules.set(r.id, r));
  }

  private initializeEducationDomain(): void {
    const educationDomain: DomainKnowledge = {
      domain: 'education',
      facts: [
        { id: 'edu_spaced_repetition', predicate: 'learning_technique', arguments: ['spaced_repetition', 'effective', 'memory'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'education' },
        { id: 'edu_active_recall', predicate: 'learning_technique', arguments: ['active_recall', 'effective', 'retention'], confidence: 1, source: 'domain', timestamp: Date.now(), domain: 'education' },
      ],
      rules: [],
      constraints: [],
      vocabulary: new Map([
        ['flashcard', ['card', 'study card', 'memory card']],
        ['quiz', ['test', 'assessment', 'exam', 'evaluation']],
        ['study', ['learn', 'review', 'practice', 'memorize']],
        ['verse', ['scripture', 'passage', 'text', 'quote', 'citation']],
        ['bible', ['scripture', 'word', 'holy book', 'testament']],
        ['prayer', ['devotion', 'meditation', 'worship', 'spiritual practice']],
      ]),
      templates: [
        {
          id: 'edu_flashcard_app',
          domain: 'education',
          pattern: 'flashcard|study.*card|memorize',
          template: 'A flashcard study app with: deck management with categories, card creation with front/back, spaced repetition algorithm for optimal review timing, swipe gestures for know/dont know, progress tracking per deck, statistics showing mastery level, daily study reminders, and local storage with export option.',
          requiredFields: [],
          optionalFields: ['decks', 'reviewInterval'],
          priority: 10
        },
        {
          id: 'edu_bible_verse_app',
          domain: 'education',
          pattern: 'bible|verse|scripture|prayer.*daily',
          template: 'A Bible verse app with: comprehensive verse library categorized by theme (hope, strength, peace, gratitude, comfort), searchable list with book/chapter/verse references, favorites system with heart toggle, verse of the day on main screen with share button, daily notification system with customizable times, reading history, copy-to-clipboard functionality, and offline access to full verse database.',
          requiredFields: [],
          optionalFields: ['translation', 'categories', 'notificationTimes'],
          priority: 10
        },
      ]
    };

    this.domains.set('education', educationDomain);
    educationDomain.facts.forEach(f => this.facts.set(f.id, f));
  }

  private initializeMobilePlatformConstraints(): void {
    // Platform-specific constraints that apply to all oracles
    const platformConstraints: Constraint[] = [
      {
        id: 'platform_battery',
        name: 'Battery Efficiency',
        type: 'required',
        domain: 'platform',
        condition: 'has_background_process -> battery_optimized',
        message: 'Background processes must be battery-efficient. Use intervals, not continuous polling.',
        severity: 'warning'
      },
      {
        id: 'platform_offline',
        name: 'Offline First',
        type: 'preference',
        domain: 'platform',
        condition: 'stores_data -> local_storage_primary',
        message: 'Apps should work offline with local storage as primary.',
        severity: 'info'
      },
      {
        id: 'platform_notification_permission',
        name: 'Notification Permission',
        type: 'required',
        domain: 'platform',
        condition: 'uses_notifications -> request_permission_gracefully',
        message: 'Must request notification permission with clear explanation of value.',
        severity: 'warning'
      },
      {
        id: 'platform_memory',
        name: 'Memory Efficiency',
        type: 'required',
        domain: 'platform',
        condition: 'large_data_set -> pagination_or_virtualization',
        message: 'Large lists must use FlatList with virtualization, not ScrollView.',
        severity: 'error'
      },
    ];

    platformConstraints.forEach(c => this.constraints.set(c.id, c));
  }

  private initializeInferenceRules(): void {
    // Meta-rules for inference
    const inferenceRules: Rule[] = [
      {
        id: 'infer_domain_from_concepts',
        name: 'Domain Inference',
        description: 'Infer domain from detected concepts',
        conditions: [
          { predicate: 'contains_concept', arguments: [{ name: 'X', type: 'variable' }, { name: 'C', type: 'variable' }] },
          { predicate: 'concept_domain', arguments: [{ name: 'C', type: 'variable' }, { name: 'D', type: 'variable' }] },
        ],
        conclusion: { predicate: 'likely_domain', arguments: [{ name: 'X', type: 'variable' }, { name: 'D', type: 'variable' }] },
        priority: 100
      },
      {
        id: 'infer_tracker_needs_history',
        name: 'Tracker History Requirement',
        description: 'Any tracker needs history view',
        conditions: [
          { predicate: 'app_type', arguments: [{ name: 'X', type: 'variable' }, 'tracker'] },
        ],
        conclusion: { predicate: 'requires_feature', arguments: [{ name: 'X', type: 'variable' }, 'history_view', 'statistics'] },
        priority: 50
      },
      {
        id: 'infer_reminder_needs_notification',
        name: 'Reminder Notification Requirement',
        description: 'Any reminder needs notifications',
        conditions: [
          { predicate: 'contains_concept', arguments: [{ name: 'X', type: 'variable' }, 'reminder'] },
        ],
        conclusion: { predicate: 'requires_feature', arguments: [{ name: 'X', type: 'variable' }, 'notification', 'time_picker'] },
        priority: 50
      },
    ];

    inferenceRules.forEach(r => this.rules.set(r.id, r));
  }

  // ==========================================================================
  // QUERY INTERFACE
  // ==========================================================================

  getFacts(predicate?: string, domain?: string): Fact[] {
    let results = Array.from(this.facts.values());
    if (predicate) {
      results = results.filter(f => f.predicate === predicate);
    }
    if (domain) {
      results = results.filter(f => f.domain === domain);
    }
    return results;
  }

  getRules(domain?: string): Rule[] {
    let results = Array.from(this.rules.values());
    if (domain) {
      results = results.filter(r => r.domain === domain || !r.domain);
    }
    return results.sort((a, b) => b.priority - a.priority);
  }

  getConstraints(domain?: string): Constraint[] {
    let results = Array.from(this.constraints.values());
    if (domain) {
      results = results.filter(c => c.domain === domain || c.domain === 'platform');
    }
    return results;
  }

  getDomain(name: string): DomainKnowledge | undefined {
    return this.domains.get(name);
  }

  getAllDomains(): string[] {
    return Array.from(this.domains.keys());
  }

  getVocabulary(domain: string): Map<string, string[]> {
    const d = this.domains.get(domain);
    return d?.vocabulary || new Map();
  }

  getTemplates(domain?: string): PromptTemplate[] {
    if (domain) {
      const d = this.domains.get(domain);
      return d?.templates || [];
    }
    const all: PromptTemplate[] = [];
    this.domains.forEach(d => all.push(...d.templates));
    return all.sort((a, b) => b.priority - a.priority);
  }

  // ==========================================================================
  // FACT MANAGEMENT
  // ==========================================================================

  assertFact(fact: Omit<Fact, 'id' | 'timestamp'>): Fact {
    const id = `fact_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const newFact: Fact = {
      ...fact,
      id,
      timestamp: Date.now(),
      confidence: 1,
    };
    this.facts.set(id, newFact);
    this.persistToStorage();
    return newFact;
  }

  retractFact(id: string): boolean {
    const result = this.facts.delete(id);
    if (result) this.persistToStorage();
    return result;
  }

  // ==========================================================================
  // USER CONTEXT MANAGEMENT
  // ==========================================================================

  async getUserContext(): Promise<UserContext> {
    if (!this.userContext) {
      try {
        const stored = await AsyncStorage.getItem(this.USER_CONTEXT_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          this.userContext = {
            ...parsed,
            preferences: new Map(Object.entries(parsed.preferences || {})),
            domainExpertise: new Map(Object.entries(parsed.domainExpertise || {})),
          };
        }
      } catch (e) {
        console.warn('[KnowledgeBase] Failed to load user context:', e);
      }

      if (!this.userContext) {
        this.userContext = {
          userId: `user_${Date.now()}`,
          sessionHistory: [],
          preferences: new Map(),
          createdOracles: [],
          domainExpertise: new Map(),
        };
      }
    }
    return this.userContext;
  }

  async addSessionEntry(entry: Omit<SessionEntry, 'timestamp'>): Promise<void> {
    const ctx = await this.getUserContext();
    ctx.sessionHistory.push({
      ...entry,
      timestamp: Date.now(),
    });

    // Keep last 1000 entries for infinite context
    if (ctx.sessionHistory.length > 1000) {
      ctx.sessionHistory = ctx.sessionHistory.slice(-1000);
    }

    await this.persistUserContext();
  }

  async updateDomainExpertise(domain: string, score: number): Promise<void> {
    const ctx = await this.getUserContext();
    const current = ctx.domainExpertise.get(domain) || 0;
    ctx.domainExpertise.set(domain, Math.min(1, current + score * 0.1));
    await this.persistUserContext();
  }

  async setPreference(key: string, value: any): Promise<void> {
    const ctx = await this.getUserContext();
    ctx.preferences.set(key, value);
    await this.persistUserContext();
  }

  async getPreference<T>(key: string, defaultValue: T): Promise<T> {
    const ctx = await this.getUserContext();
    return ctx.preferences.get(key) ?? defaultValue;
  }

  async addCreatedOracle(oracle: OracleMetadata): Promise<void> {
    const ctx = await this.getUserContext();
    ctx.createdOracles.push(oracle);
    await this.persistUserContext();
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private async loadFromStorage(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.facts) {
          data.facts.forEach((f: Fact) => this.facts.set(f.id, f));
        }
      }
    } catch (e) {
      console.warn('[KnowledgeBase] Failed to load from storage:', e);
    }
  }

  private async persistToStorage(): Promise<void> {
    try {
      const data = {
        facts: Array.from(this.facts.values()).filter(f => f.source === 'user' || f.source === 'inferred'),
        version: 1,
      };
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('[KnowledgeBase] Failed to persist to storage:', e);
    }
  }

  private async persistUserContext(): Promise<void> {
    if (!this.userContext) return;
    try {
      const serializable = {
        ...this.userContext,
        preferences: Object.fromEntries(this.userContext.preferences),
        domainExpertise: Object.fromEntries(this.userContext.domainExpertise),
      };
      await AsyncStorage.setItem(this.USER_CONTEXT_KEY, JSON.stringify(serializable));
    } catch (e) {
      console.warn('[KnowledgeBase] Failed to persist user context:', e);
    }
  }
}

// Singleton instance
export const KnowledgeBase = new KnowledgeBaseImpl();
