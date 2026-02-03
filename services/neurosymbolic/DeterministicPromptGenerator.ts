/**
 * DeterministicPromptGenerator - Generates exact, optimal prompts using symbolic reasoning
 * No probabilistic elements - pure logical derivation from knowledge base
 */

import { KnowledgeBase, PromptTemplate, UserContext, SessionEntry } from './KnowledgeBase';
import { SymbolicReasoner, ReasoningContext } from './SymbolicReasoner';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface GeneratedPrompt {
  prompt: string;
  confidence: number;
  domain: string;
  template: string | null;
  requiredFeatures: string[];
  appliedRules: string[];
  warnings: string[];
  suggestions: string[];
  metadata: PromptMetadata;
}

export interface PromptMetadata {
  inputLength: number;
  conceptCount: number;
  featureCount: number;
  templateUsed: boolean;
  userContextApplied: boolean;
  constraintsChecked: number;
  generationTimeMs: number;
}

export interface PromptComponent {
  type: 'core' | 'feature' | 'ui' | 'data' | 'constraint';
  text: string;
  priority: number;
  source: string;
}

// ============================================================================
// DETERMINISTIC PROMPT GENERATOR
// ============================================================================

class DeterministicPromptGeneratorImpl {
  private initialized = false;

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await KnowledgeBase.initialize();
    await SymbolicReasoner.initialize();
    this.initialized = true;
    console.log('[DeterministicPromptGenerator] Initialized');
  }

  // ==========================================================================
  // MAIN GENERATION PIPELINE
  // ==========================================================================

  async generatePrompt(userInput: string): Promise<GeneratedPrompt> {
    const startTime = Date.now();
    await this.initialize();

    // Step 1: Symbolic reasoning on input
    const reasoningContext = await SymbolicReasoner.reason(userInput);

    // Step 2: Get user context for personalization
    const userContext = await KnowledgeBase.getUserContext();

    // Step 3: Find matching template or build from components
    const template = this.findBestTemplate(reasoningContext);

    // Step 4: Build prompt components
    const components = this.buildPromptComponents(reasoningContext, userContext, template);

    // Step 5: Assemble final prompt deterministically
    const prompt = this.assemblePrompt(components, reasoningContext);

    // Step 6: Apply domain-specific refinements
    const refinedPrompt = this.applyDomainRefinements(prompt, reasoningContext);

    // Step 7: Generate suggestions for improvement
    const suggestions = this.generateSuggestions(reasoningContext, userContext);

    // Step 8: Record session for context retention
    await this.recordSession(userInput, refinedPrompt, reasoningContext);

    const endTime = Date.now();

    return {
      prompt: refinedPrompt,
      confidence: reasoningContext.domainConfidence,
      domain: reasoningContext.domain || 'general',
      template: template?.id || null,
      requiredFeatures: reasoningContext.requiredFeatures,
      appliedRules: reasoningContext.applicableRules.map(r => r.name),
      warnings: reasoningContext.warnings,
      suggestions,
      metadata: {
        inputLength: userInput.length,
        conceptCount: reasoningContext.detectedConcepts.length,
        featureCount: reasoningContext.requiredFeatures.length,
        templateUsed: template !== null,
        userContextApplied: userContext.sessionHistory.length > 0,
        constraintsChecked: reasoningContext.applicableConstraints.length,
        generationTimeMs: endTime - startTime,
      },
    };
  }

  // ==========================================================================
  // TEMPLATE MATCHING
  // ==========================================================================

  private findBestTemplate(context: ReasoningContext): PromptTemplate | null {
    const templates = KnowledgeBase.getTemplates(context.domain || undefined);
    
    let bestTemplate: PromptTemplate | null = null;
    let bestScore = 0;

    for (const template of templates) {
      const pattern = new RegExp(template.pattern, 'i');
      if (pattern.test(context.normalizedInput)) {
        const score = this.scoreTemplate(template, context);
        if (score > bestScore) {
          bestScore = score;
          bestTemplate = template;
        }
      }
    }

    return bestScore > 0.5 ? bestTemplate : null;
  }

  private scoreTemplate(template: PromptTemplate, context: ReasoningContext): number {
    let score = template.priority / 100; // Base score from priority

    // Bonus for domain match
    if (template.domain === context.domain) {
      score += 0.3;
    }

    // Bonus for required fields that can be inferred
    const inferrableFields = template.requiredFields.filter(f => 
      this.canInferField(f, context)
    );
    score += (inferrableFields.length / Math.max(1, template.requiredFields.length)) * 0.3;

    return Math.min(1, score);
  }

  private canInferField(field: string, context: ReasoningContext): boolean {
    // Check if we have enough context to fill this field
    const fieldPatterns: Record<string, string[]> = {
      'dailyGoal': ['goal', 'target', 'amount', 'quantity'],
      'unit': ['ml', 'oz', 'liters', 'cups', 'glasses'],
      'startTime': ['morning', 'am', 'start', 'from', 'beginning'],
      'endTime': ['evening', 'pm', 'end', 'to', 'until'],
    };

    const patterns = fieldPatterns[field];
    if (!patterns) return false;

    return patterns.some(p => 
      context.normalizedInput.includes(p) ||
      context.detectedConcepts.some(c => c.concept.includes(p))
    );
  }

  // ==========================================================================
  // COMPONENT BUILDING
  // ==========================================================================

  private buildPromptComponents(
    context: ReasoningContext,
    userContext: UserContext,
    template: PromptTemplate | null
  ): PromptComponent[] {
    const components: PromptComponent[] = [];

    // 1. Core description component
    components.push(this.buildCoreComponent(context, template));

    // 2. Required features components
    for (const feature of context.requiredFeatures) {
      components.push(this.buildFeatureComponent(feature, context));
    }

    // 3. UI components based on app type
    components.push(...this.buildUIComponents(context));

    // 4. Data persistence components
    components.push(...this.buildDataComponents(context));

    // 5. Constraint-driven components
    for (const constraint of context.applicableConstraints) {
      if (constraint.type === 'required') {
        components.push({
          type: 'constraint',
          text: this.constraintToRequirement(constraint),
          priority: 90,
          source: constraint.id,
        });
      }
    }

    // 6. User preference components
    components.push(...this.buildUserPreferenceComponents(userContext, context));

    // Sort by priority
    return components.sort((a, b) => b.priority - a.priority);
  }

  private buildCoreComponent(context: ReasoningContext, template: PromptTemplate | null): PromptComponent {
    let text: string;

    if (template) {
      // Fill template with inferred values
      text = this.fillTemplate(template.template, context);
    } else {
      // Build from concepts
      text = this.buildCoreFromConcepts(context);
    }

    return {
      type: 'core',
      text,
      priority: 100,
      source: template?.id || 'inferred',
    };
  }

  private fillTemplate(templateStr: string, context: ReasoningContext): string {
    let filled = templateStr;

    // Extract and fill placeholders
    const placeholders = templateStr.match(/\{(\w+)\}/g) || [];
    
    for (const placeholder of placeholders) {
      const field = placeholder.slice(1, -1);
      const value = this.inferFieldValue(field, context);
      filled = filled.replace(placeholder, value);
    }

    return filled;
  }

  private inferFieldValue(field: string, context: ReasoningContext): string {
    // Use knowledge base facts to infer values
    const defaults: Record<string, string> = {
      'dailyGoal': '2000',
      'unit': 'ml',
      'startTime': '6:00 AM',
      'endTime': '10:00 PM',
      'quickAmounts': '250ml, 500ml, 750ml, 1L',
      'workDuration': '25',
      'shortBreak': '5',
      'longBreak': '15',
      'sessionsBeforeLongBreak': '4',
    };

    // Check user input for specific values
    const numbers = context.normalizedInput.match(/\d+/g);
    if (field === 'dailyGoal' && numbers) {
      const likely = numbers.find(n => parseInt(n) > 500 && parseInt(n) <= 5000);
      if (likely) return likely;
    }

    // Check for time mentions
    if (field === 'startTime') {
      const timeMatch = context.normalizedInput.match(/(\d{1,2})\s*(am|pm)/i);
      if (timeMatch) return `${timeMatch[1]}:00 ${timeMatch[2].toUpperCase()}`;
    }

    if (field === 'endTime') {
      const timeMatch = context.normalizedInput.match(/to\s*(\d{1,2})\s*(am|pm)/i);
      if (timeMatch) return `${timeMatch[1]}:00 ${timeMatch[2].toUpperCase()}`;
    }

    // Check for unit mentions
    if (field === 'unit') {
      if (context.normalizedInput.includes('oz') || context.normalizedInput.includes('ounce')) return 'oz';
      if (context.normalizedInput.includes('cup')) return 'cups';
      if (context.normalizedInput.includes('liter') || context.normalizedInput.includes('litre')) return 'L';
    }

    return defaults[field] || field;
  }

  private buildCoreFromConcepts(context: ReasoningContext): string {
    const parts: string[] = [];

    // Determine app type
    const appTypes = context.inferredFacts
      .filter(f => f.predicate === 'app_type')
      .map(f => f.arguments[1]);

    if (appTypes.length > 0) {
      const typeStr = appTypes.join(' and ');
      parts.push(`A ${context.domain || 'utility'} ${typeStr} app`);
    } else {
      parts.push(`A ${context.domain || 'utility'} application`);
    }

    // Add main concepts
    const mainConcepts = context.detectedConcepts
      .slice(0, 3)
      .map(c => c.concept);
    
    if (mainConcepts.length > 0) {
      parts.push(`for ${mainConcepts.join(', ')}`);
    }

    return parts.join(' ') + ' with:';
  }

  private buildFeatureComponent(feature: string, context: ReasoningContext): PromptComponent {
    const featureDescriptions: Record<string, string> = {
      'hourly_reminder': 'customizable hourly reminder notifications',
      'progress_visualization': 'visual progress tracking with charts and indicators',
      'notification': 'push notifications for important events',
      'time_picker': 'time selection interface for scheduling',
      'history_view': 'historical data view with filtering options',
      'statistics': 'statistics and analytics dashboard',
      'haptic_feedback': 'haptic feedback for user interactions',
      'sound_notification': 'audio notifications and alerts',
      'persistent_notification': 'persistent notifications that cannot be dismissed until acted upon',
      'dose_logging': 'detailed logging with timestamps and notes',
      'game_timer': 'game/match timer with period tracking',
      'period_tracking': 'period/quarter/half tracking for sports',
    };

    return {
      type: 'feature',
      text: featureDescriptions[feature] || feature.replace(/_/g, ' '),
      priority: 70,
      source: 'inferred_feature',
    };
  }

  private buildUIComponents(context: ReasoningContext): PromptComponent[] {
    const components: PromptComponent[] = [];

    // Standard UI elements based on app type
    const hasTracker = context.inferredFacts.some(f => 
      f.predicate === 'app_type' && f.arguments[1] === 'tracker'
    );

    if (hasTracker) {
      components.push({
        type: 'ui',
        text: 'main dashboard showing current status and quick actions',
        priority: 60,
        source: 'ui_tracker',
      });
      components.push({
        type: 'ui',
        text: 'calendar or list view for historical data',
        priority: 55,
        source: 'ui_tracker',
      });
    }

    const hasReminder = context.inferredFacts.some(f =>
      f.predicate === 'contains_concept' && f.arguments[1] === 'reminder'
    ) || context.normalizedInput.includes('remind');

    if (hasReminder) {
      components.push({
        type: 'ui',
        text: 'settings screen for configuring reminder times and preferences',
        priority: 60,
        source: 'ui_reminder',
      });
    }

    // Always add navigation
    components.push({
      type: 'ui',
      text: 'tab bar or view switching for navigation between main, history, and settings sections',
      priority: 50,
      source: 'ui_standard',
    });

    return components;
  }

  private buildDataComponents(context: ReasoningContext): PromptComponent[] {
    const components: PromptComponent[] = [];

    // Data persistence is almost always needed
    components.push({
      type: 'data',
      text: 'local data persistence to maintain all user data across app restarts',
      priority: 80,
      source: 'data_persistence',
    });

    // Export functionality for trackers
    const hasTracker = context.inferredFacts.some(f =>
      f.predicate === 'app_type' && f.arguments[1] === 'tracker'
    );

    if (hasTracker) {
      components.push({
        type: 'data',
        text: 'data export functionality for backup or analysis',
        priority: 40,
        source: 'data_export',
      });
    }

    return components;
  }

  private buildUserPreferenceComponents(userContext: UserContext, context: ReasoningContext): PromptComponent[] {
    const components: PromptComponent[] = [];

    // Check for patterns in previous oracles
    const similarOracles = userContext.createdOracles.filter(o => 
      o.domain === context.domain
    );

    if (similarOracles.length > 0) {
      // Extract common features from similar oracles
      const commonFeatures = new Map<string, number>();
      for (const oracle of similarOracles) {
        for (const feature of oracle.features) {
          commonFeatures.set(feature, (commonFeatures.get(feature) || 0) + 1);
        }
      }

      // Add frequently used features
      commonFeatures.forEach((count, feature) => {
        if (count >= 2) {
          components.push({
            type: 'feature',
            text: `${feature} (based on your preferences)`,
            priority: 45,
            source: 'user_preference',
          });
        }
      });
    }

    return components;
  }

  private constraintToRequirement(constraint: { message: string }): string {
    return constraint.message;
  }

  // ==========================================================================
  // PROMPT ASSEMBLY
  // ==========================================================================

  private assemblePrompt(components: PromptComponent[], context: ReasoningContext): string {
    const parts: string[] = [];

    // Start with core component
    const core = components.find(c => c.type === 'core');
    if (core) {
      parts.push(core.text);
    }

    // Group remaining components by type
    const features = components.filter(c => c.type === 'feature');
    const ui = components.filter(c => c.type === 'ui');
    const data = components.filter(c => c.type === 'data');
    const constraints = components.filter(c => c.type === 'constraint');

    // Add features
    if (features.length > 0) {
      const featureList = features.map(f => f.text).join('; ');
      parts.push(featureList);
    }

    // Add UI elements
    if (ui.length > 0) {
      const uiList = ui.map(u => u.text).join('; ');
      parts.push(uiList);
    }

    // Add data handling
    if (data.length > 0) {
      const dataList = data.map(d => d.text).join('; ');
      parts.push(dataList);
    }

    // Add constraint requirements
    if (constraints.length > 0) {
      parts.push('Ensure: ' + constraints.map(c => c.text).join('; '));
    }

    // Add interaction details
    parts.push('User interactions include tap, long-press, and swipe gestures where appropriate.');

    return parts.join('. ').replace(/\.\./g, '.');
  }

  // ==========================================================================
  // DOMAIN REFINEMENTS
  // ==========================================================================

  private applyDomainRefinements(prompt: string, context: ReasoningContext): string {
    let refined = prompt;

    // Domain-specific additions
    switch (context.domain) {
      case 'health':
        if (!refined.includes('privacy') && !refined.includes('local')) {
          refined += ' All health data should be stored locally for privacy.';
        }
        break;

      case 'productivity':
        if (!refined.includes('offline')) {
          refined += ' The app should work fully offline.';
        }
        break;

      case 'finance':
        if (!refined.includes('secure') && !refined.includes('local')) {
          refined += ' Financial data must be stored securely on device only.';
        }
        break;

      case 'sports':
        if (!refined.includes('haptic')) {
          refined += ' Include haptic feedback for timer events.';
        }
        break;
    }

    // Add light theme specification
    refined += ' Use light theme with colors: background #F5F5F5, cards #FFFFFF, text #333333, accent #26A69A.';

    return refined;
  }

  // ==========================================================================
  // SUGGESTIONS
  // ==========================================================================

  private generateSuggestions(context: ReasoningContext, userContext: UserContext): string[] {
    const suggestions: string[] = [];

    // Suggest based on missing common features
    const hasNotification = context.requiredFeatures.some(f => f.includes('notification'));
    const hasHistory = context.requiredFeatures.some(f => f.includes('history'));
    const hasStats = context.requiredFeatures.some(f => f.includes('statistic'));

    if (!hasNotification && (context.domain === 'health' || context.domain === 'productivity')) {
      suggestions.push('Consider adding reminder notifications for better engagement');
    }

    if (!hasHistory && context.inferredFacts.some(f => f.predicate === 'app_type' && f.arguments[1] === 'tracker')) {
      suggestions.push('Adding a history view would help users track progress over time');
    }

    if (!hasStats && context.inferredFacts.some(f => f.predicate === 'app_type' && f.arguments[1] === 'tracker')) {
      suggestions.push('Statistics and charts can provide valuable insights to users');
    }

    // Suggest based on user history
    if (userContext.sessionHistory.length > 5) {
      const recentDomains = userContext.sessionHistory
        .slice(-5)
        .map(s => s.interpretedIntent)
        .filter(Boolean);
      
      // Check if user is exploring new domain
      if (context.domain && !recentDomains.some(d => d.includes(context.domain!))) {
        suggestions.push(`New domain detected: ${context.domain}. Explore templates for inspiration.`);
      }
    }

    return suggestions;
  }

  // ==========================================================================
  // SESSION RECORDING
  // ==========================================================================

  private async recordSession(input: string, generatedPrompt: string, context: ReasoningContext): Promise<void> {
    await KnowledgeBase.addSessionEntry({
      input,
      interpretedIntent: context.domain || 'general',
      generatedPrompt,
    });

    // Update domain expertise
    if (context.domain) {
      await KnowledgeBase.updateDomainExpertise(context.domain, 1);
    }
  }
}

// Singleton instance
export const DeterministicPromptGenerator = new DeterministicPromptGeneratorImpl();
