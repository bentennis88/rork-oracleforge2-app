/**
 * SymbolicReasoner - Logical inference engine using forward and backward chaining
 * Implements deterministic reasoning over the knowledge base
 */

import { KnowledgeBase, Fact, Rule, Constraint, Variable, Condition } from './KnowledgeBase';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface ReasoningContext {
  input: string;
  normalizedInput: string;
  detectedConcepts: ConceptMatch[];
  inferredFacts: Fact[];
  applicableRules: Rule[];
  applicableConstraints: Constraint[];
  domain: string | null;
  domainConfidence: number;
  requiredFeatures: string[];
  warnings: string[];
  errors: string[];
}

export interface ConceptMatch {
  concept: string;
  matchedText: string;
  position: number;
  domain: string;
  confidence: number;
  synonymUsed?: string;
}

export interface Binding {
  [variable: string]: string;
}

export interface InferenceResult {
  fact: Fact;
  rule: Rule;
  bindings: Binding;
}

// ============================================================================
// SYMBOLIC REASONER CLASS
// ============================================================================

class SymbolicReasonerImpl {
  private conceptIndex: Map<string, { domain: string; synonyms: string[] }> = new Map();
  private initialized = false;

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    await KnowledgeBase.initialize();
    this.buildConceptIndex();
    this.initialized = true;
    console.log('[SymbolicReasoner] Initialized with', this.conceptIndex.size, 'concepts');
  }

  private buildConceptIndex(): void {
    const domains = KnowledgeBase.getAllDomains();
    
    for (const domain of domains) {
      const vocab = KnowledgeBase.getVocabulary(domain);
      vocab.forEach((synonyms, concept) => {
        // Index the main concept
        this.conceptIndex.set(concept.toLowerCase(), { domain, synonyms });
        
        // Index all synonyms pointing to the main concept
        synonyms.forEach(syn => {
          if (!this.conceptIndex.has(syn.toLowerCase())) {
            this.conceptIndex.set(syn.toLowerCase(), { domain, synonyms: [concept, ...synonyms.filter(s => s !== syn)] });
          }
        });
      });
    }
  }

  // ==========================================================================
  // MAIN REASONING PIPELINE
  // ==========================================================================

  async reason(input: string): Promise<ReasoningContext> {
    await this.initialize();

    const context: ReasoningContext = {
      input,
      normalizedInput: this.normalizeInput(input),
      detectedConcepts: [],
      inferredFacts: [],
      applicableRules: [],
      applicableConstraints: [],
      domain: null,
      domainConfidence: 0,
      requiredFeatures: [],
      warnings: [],
      errors: [],
    };

    // Step 1: Detect concepts in input
    context.detectedConcepts = this.detectConcepts(context.normalizedInput);

    // Step 2: Infer domain from concepts
    const domainResult = this.inferDomain(context.detectedConcepts);
    context.domain = domainResult.domain;
    context.domainConfidence = domainResult.confidence;

    // Step 3: Create working facts from input
    const workingFacts = this.createWorkingFacts(context);

    // Step 4: Forward chaining - apply rules until fixpoint
    const inferredFacts = this.forwardChain(workingFacts, context.domain);
    context.inferredFacts = inferredFacts;

    // Step 5: Extract required features from inferred facts
    context.requiredFeatures = this.extractRequiredFeatures(inferredFacts);

    // Step 6: Get applicable rules
    context.applicableRules = KnowledgeBase.getRules(context.domain || undefined)
      .filter(r => this.isRuleApplicable(r, workingFacts));

    // Step 7: Get and check constraints
    context.applicableConstraints = KnowledgeBase.getConstraints(context.domain || undefined);
    this.checkConstraints(context);

    return context;
  }

  // ==========================================================================
  // TEXT PROCESSING
  // ==========================================================================

  private normalizeInput(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^\w\s'-]/g, ' ')  // Keep apostrophes and hyphens
      .replace(/\s+/g, ' ')
      .trim();
  }

  private detectConcepts(normalizedInput: string): ConceptMatch[] {
    const matches: ConceptMatch[] = [];
    const words = normalizedInput.split(' ');
    
    // Single word matching
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const entry = this.conceptIndex.get(word);
      if (entry) {
        matches.push({
          concept: word,
          matchedText: word,
          position: i,
          domain: entry.domain,
          confidence: 1.0,
        });
      }
    }

    // Multi-word phrase matching (2-3 word phrases)
    for (let len = 2; len <= 3 && len <= words.length; len++) {
      for (let i = 0; i <= words.length - len; i++) {
        const phrase = words.slice(i, i + len).join(' ');
        const entry = this.conceptIndex.get(phrase);
        if (entry) {
          matches.push({
            concept: phrase,
            matchedText: phrase,
            position: i,
            domain: entry.domain,
            confidence: 1.0,
          });
        }
      }
    }

    // Check for synonyms in full text
    this.conceptIndex.forEach((entry, concept) => {
      if (!matches.some(m => m.concept === concept)) {
        for (const syn of entry.synonyms) {
          const synLower = syn.toLowerCase();
          const idx = normalizedInput.indexOf(synLower);
          if (idx !== -1) {
            matches.push({
              concept,
              matchedText: syn,
              position: idx,
              domain: entry.domain,
              confidence: 0.9, // Slightly lower confidence for synonym match
              synonymUsed: syn,
            });
            break; // Only add once per concept
          }
        }
      }
    });

    // Deduplicate by concept, keeping highest confidence
    const deduped = new Map<string, ConceptMatch>();
    for (const match of matches) {
      const existing = deduped.get(match.concept);
      if (!existing || match.confidence > existing.confidence) {
        deduped.set(match.concept, match);
      }
    }

    return Array.from(deduped.values());
  }

  private inferDomain(concepts: ConceptMatch[]): { domain: string | null; confidence: number } {
    const domainScores = new Map<string, number>();

    for (const concept of concepts) {
      const current = domainScores.get(concept.domain) || 0;
      domainScores.set(concept.domain, current + concept.confidence);
    }

    if (domainScores.size === 0) {
      return { domain: null, confidence: 0 };
    }

    let maxDomain = '';
    let maxScore = 0;
    let totalScore = 0;

    domainScores.forEach((score, domain) => {
      totalScore += score;
      if (score > maxScore) {
        maxScore = score;
        maxDomain = domain;
      }
    });

    return {
      domain: maxDomain,
      confidence: totalScore > 0 ? maxScore / totalScore : 0,
    };
  }

  // ==========================================================================
  // FORWARD CHAINING
  // ==========================================================================

  private createWorkingFacts(context: ReasoningContext): Fact[] {
    const facts: Fact[] = [];
    const timestamp = Date.now();

    // Create fact for the input itself
    facts.push({
      id: 'input_text',
      predicate: 'input_text',
      arguments: [context.normalizedInput],
      confidence: 1,
      source: 'system',
      timestamp,
    });

    // Create facts for detected concepts
    for (const concept of context.detectedConcepts) {
      facts.push({
        id: `concept_${concept.concept}`,
        predicate: 'contains_concept',
        arguments: ['input', concept.concept],
        confidence: 1,
        source: 'inferred',
        timestamp,
        domain: concept.domain,
      });
    }

    // Create domain fact if inferred
    if (context.domain) {
      facts.push({
        id: 'domain_inferred',
        predicate: 'domain',
        arguments: [context.domain],
        confidence: 1,
        source: 'inferred',
        timestamp,
      });
    }

    // Detect app type patterns
    const appTypes = this.detectAppTypes(context.normalizedInput);
    for (const appType of appTypes) {
      facts.push({
        id: `app_type_${appType}`,
        predicate: 'app_type',
        arguments: ['input', appType],
        confidence: 1,
        source: 'inferred',
        timestamp,
      });
    }

    return facts;
  }

  private detectAppTypes(input: string): string[] {
    const types: string[] = [];
    
    const patterns: [RegExp, string][] = [
      [/track(er|ing)?|log(ger|ging)?|monitor/i, 'tracker'],
      [/remind(er)?|alert|notif/i, 'reminder'],
      [/timer|stopwatch|countdown/i, 'timer'],
      [/calculator|compute|calculate/i, 'calculator'],
      [/list|todo|task/i, 'list'],
      [/quiz|test|flashcard/i, 'quiz'],
      [/game|play/i, 'game'],
      [/calendar|schedule|planner/i, 'scheduler'],
    ];

    for (const [pattern, type] of patterns) {
      if (pattern.test(input)) {
        types.push(type);
      }
    }

    return types;
  }

  private forwardChain(workingFacts: Fact[], domain: string | null): Fact[] {
    const inferred: Fact[] = [];
    const factSet = new Set(workingFacts.map(f => this.factKey(f)));
    let changed = true;
    let iterations = 0;
    const maxIterations = 100; // Prevent infinite loops

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      const rules = KnowledgeBase.getRules(domain || undefined);

      for (const rule of rules) {
        const bindings = this.matchRule(rule, [...workingFacts, ...inferred]);
        
        for (const binding of bindings) {
          const newFact = this.applyConclusion(rule.conclusion, binding);
          const key = this.factKey(newFact);
          
          if (!factSet.has(key)) {
            factSet.add(key);
            inferred.push(newFact);
            changed = true;
          }
        }
      }
    }

    return inferred;
  }

  private factKey(fact: Fact): string {
    return `${fact.predicate}(${fact.arguments.join(',')})`;
  }

  private matchRule(rule: Rule, facts: Fact[]): Binding[] {
    // Start with empty binding
    let bindings: Binding[] = [{}];

    for (const condition of rule.conditions) {
      const newBindings: Binding[] = [];

      for (const binding of bindings) {
        const matches = this.matchCondition(condition, facts, binding);
        newBindings.push(...matches);
      }

      bindings = newBindings;
      if (bindings.length === 0) break;
    }

    return bindings;
  }

  private matchCondition(condition: Condition, facts: Fact[], currentBinding: Binding): Binding[] {
    const matches: Binding[] = [];

    for (const fact of facts) {
      if (fact.predicate !== condition.predicate) continue;
      if (condition.negated) continue; // Skip negated for now (simple implementation)

      const newBinding = this.unify(condition.arguments, fact.arguments, { ...currentBinding });
      if (newBinding) {
        matches.push(newBinding);
      }
    }

    return matches;
  }

  private unify(pattern: (string | Variable)[], values: string[], binding: Binding): Binding | null {
    if (pattern.length !== values.length) return null;

    for (let i = 0; i < pattern.length; i++) {
      const p = pattern[i];
      const v = values[i];

      if (typeof p === 'object' && p.type === 'variable') {
        // Variable
        if (binding[p.name] !== undefined) {
          if (binding[p.name] !== v) return null; // Conflict
        } else {
          binding[p.name] = v;
        }
      } else {
        // Constant
        if (p !== v) return null;
      }
    }

    return binding;
  }

  private applyConclusion(conclusion: { predicate: string; arguments: (string | Variable)[] }, binding: Binding): Fact {
    const args: string[] = conclusion.arguments.map(arg => {
      if (typeof arg === 'object' && arg.type === 'variable') {
        return binding[arg.name] || arg.name;
      }
      return arg as string;
    });

    return {
      id: `inferred_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      predicate: conclusion.predicate,
      arguments: args,
      confidence: 1,
      source: 'inferred',
      timestamp: Date.now(),
    };
  }

  private isRuleApplicable(rule: Rule, facts: Fact[]): boolean {
    return this.matchRule(rule, facts).length > 0;
  }

  // ==========================================================================
  // FEATURE EXTRACTION
  // ==========================================================================

  private extractRequiredFeatures(facts: Fact[]): string[] {
    const features = new Set<string>();

    for (const fact of facts) {
      if (fact.predicate === 'requires_feature') {
        // Arguments: [target, feature1, feature2, ...]
        for (let i = 1; i < fact.arguments.length; i++) {
          features.add(fact.arguments[i]);
        }
      }
    }

    return Array.from(features);
  }

  // ==========================================================================
  // CONSTRAINT CHECKING
  // ==========================================================================

  private checkConstraints(context: ReasoningContext): void {
    for (const constraint of context.applicableConstraints) {
      // Simple pattern matching for constraint conditions
      // In a full implementation, this would parse and evaluate the logical expression
      const triggered = this.evaluateConstraintCondition(constraint.condition, context);
      
      if (triggered) {
        if (constraint.severity === 'error') {
          context.errors.push(constraint.message);
        } else if (constraint.severity === 'warning') {
          context.warnings.push(constraint.message);
        }
      }
    }
  }

  private evaluateConstraintCondition(condition: string, context: ReasoningContext): boolean {
    // Simple keyword-based evaluation
    // Format: "antecedent -> consequent" means if antecedent is true, check consequent
    
    const [antecedent, consequent] = condition.split('->').map(s => s.trim());
    
    // Check if antecedent matches context
    const antecedentTrue = this.checkConditionPart(antecedent, context);
    
    if (!antecedentTrue) {
      return false; // Constraint doesn't apply
    }

    // Check if consequent is satisfied
    const consequentTrue = this.checkConditionPart(consequent, context);
    
    // Constraint is triggered if antecedent is true but consequent is false
    return !consequentTrue;
  }

  private checkConditionPart(part: string, context: ReasoningContext): boolean {
    const normalizedPart = part.toLowerCase().replace(/_/g, ' ');
    
    // Check against detected concepts
    for (const concept of context.detectedConcepts) {
      if (normalizedPart.includes(concept.concept.toLowerCase())) {
        return true;
      }
    }

    // Check against required features
    for (const feature of context.requiredFeatures) {
      if (normalizedPart.includes(feature.toLowerCase().replace(/_/g, ' '))) {
        return true;
      }
    }

    // Check for common conditions
    if (normalizedPart.includes('track') && context.detectedConcepts.some(c => 
      c.concept.includes('track') || c.matchedText.includes('track'))) {
      return true;
    }

    if (normalizedPart.includes('health') && context.domain === 'health') {
      return true;
    }

    if (normalizedPart.includes('notification') && context.requiredFeatures.some(f => 
      f.includes('notification') || f.includes('reminder'))) {
      return true;
    }

    return false;
  }

  // ==========================================================================
  // BACKWARD CHAINING (Goal-directed reasoning)
  // ==========================================================================

  proveGoal(goal: { predicate: string; arguments: string[] }, maxDepth: number = 10): boolean {
    return this.backwardChain(goal, new Set(), 0, maxDepth);
  }

  private backwardChain(
    goal: { predicate: string; arguments: string[] },
    visited: Set<string>,
    depth: number,
    maxDepth: number
  ): boolean {
    if (depth > maxDepth) return false;

    const goalKey = `${goal.predicate}(${goal.arguments.join(',')})`;
    if (visited.has(goalKey)) return false;
    visited.add(goalKey);

    // Check if goal is a known fact
    const facts = KnowledgeBase.getFacts(goal.predicate);
    for (const fact of facts) {
      if (this.factMatchesGoal(fact, goal)) {
        return true;
      }
    }

    // Try to prove via rules
    const rules = KnowledgeBase.getRules();
    for (const rule of rules) {
      if (rule.conclusion.predicate === goal.predicate) {
        // Try to prove all conditions
        let allConditionsMet = true;
        
        for (const condition of rule.conditions) {
          const subGoal = {
            predicate: condition.predicate,
            arguments: condition.arguments.map(a => 
              typeof a === 'object' ? goal.arguments[0] : a
            ),
          };
          
          if (!this.backwardChain(subGoal, visited, depth + 1, maxDepth)) {
            allConditionsMet = false;
            break;
          }
        }

        if (allConditionsMet) return true;
      }
    }

    return false;
  }

  private factMatchesGoal(fact: Fact, goal: { predicate: string; arguments: string[] }): boolean {
    if (fact.predicate !== goal.predicate) return false;
    if (fact.arguments.length !== goal.arguments.length) return false;
    
    for (let i = 0; i < fact.arguments.length; i++) {
      if (fact.arguments[i] !== goal.arguments[i]) return false;
    }
    
    return true;
  }
}

// Singleton instance
export const SymbolicReasoner = new SymbolicReasonerImpl();
