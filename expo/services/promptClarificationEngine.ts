import Constants from 'expo-constants';
import {
  KnowledgeBase,
  SymbolicReasoner,
  DeterministicPromptGenerator,
  AmbiguityDetector,
  AmbiguityAnalysis,
  ClarificationQuestion as NeuroQuestion,
  GeneratedPrompt,
} from './neurosymbolic';

const XAI_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  process.env.EXPO_PUBLIC_XAI_API_KEY;

// Use neurosymbolic system for deterministic prompt generation
let neuroInitialized = false;

async function ensureNeuroInitialized(): Promise<void> {
  if (neuroInitialized) return;
  try {
    await KnowledgeBase.initialize();
    neuroInitialized = true;
    console.log('[ClarificationEngine] Neurosymbolic system initialized');
  } catch (error) {
    console.warn('[ClarificationEngine] Neurosymbolic init failed:', error);
  }
}

// Types for clarification system
export interface ClarificationQuestion {
  id: string;
  question: string;
  options?: string[];  // Optional predefined options
  inputType: 'select' | 'text' | 'number' | 'time' | 'multiselect';
  placeholder?: string;
  defaultValue?: string | number;
  required: boolean;
  category: 'domain' | 'units' | 'frequency' | 'features' | 'data' | 'ui';
}

export interface ClarificationResult {
  needsClarification: boolean;
  ambiguityScore: number;  // 0-1 scale, higher = more ambiguous
  detectedIntent: string;
  questions: ClarificationQuestion[];
  suggestions: string[];  // Auto-fill suggestions if no questions
  enhancedPrompt?: string;  // If no clarification needed, provide enhanced prompt
  confidence: number;  // 0-1 scale
}

export interface ClarificationAnswers {
  [questionId: string]: string | number | string[];
}

// Keywords and patterns for domain detection
const DOMAIN_PATTERNS = {
  health: ['water', 'hydration', 'drink', 'medication', 'med', 'pill', 'vitamin', 'supplement', 'health', 'fitness', 'workout', 'exercise', 'weight', 'sleep', 'calories', 'nutrition', 'diet', 'fasting', 'blood pressure', 'glucose', 'heart rate'],
  productivity: ['task', 'todo', 'reminder', 'schedule', 'appointment', 'meeting', 'deadline', 'project', 'work', 'focus', 'pomodoro', 'time', 'habit', 'goal', 'productivity'],
  finance: ['money', 'budget', 'expense', 'income', 'savings', 'investment', 'debt', 'loan', 'interest', 'payment', 'bill', 'subscription', 'finance', 'financial', 'spending', 'cost', 'price'],
  learning: ['study', 'learn', 'read', 'book', 'course', 'lesson', 'practice', 'vocabulary', 'language', 'flashcard', 'quiz', 'education', 'skill'],
  spiritual: ['prayer', 'verse', 'bible', 'meditation', 'mindfulness', 'gratitude', 'journal', 'reflection', 'devotion', 'scripture', 'faith', 'spiritual'],
  sports: ['hockey', 'basketball', 'football', 'soccer', 'tennis', 'golf', 'swimming', 'running', 'cycling', 'score', 'game', 'match', 'tournament', 'team', 'player', 'shift', 'period'],
  home: ['chore', 'cleaning', 'laundry', 'grocery', 'shopping', 'plant', 'pet', 'maintenance', 'home', 'house'],
};

// Ambiguity indicators
const AMBIGUOUS_WORDS = ['thing', 'stuff', 'something', 'whatever', 'some', 'it', 'that', 'this', 'good', 'better', 'nice', 'simple', 'basic', 'track', 'remind', 'help'];
const VAGUE_PHRASES = ['i want', 'i need', 'make me', 'create a', 'build', 'give me', 'can you', 'please', 'just', 'maybe', 'probably', 'kind of', 'sort of'];

// Unit ambiguity patterns
const UNIT_DOMAINS: Record<string, { units: string[], question: string }> = {
  water: { units: ['ml', 'oz', 'cups', 'liters', 'glasses'], question: 'What unit do you prefer for measuring water intake?' },
  weight: { units: ['kg', 'lbs', 'stones'], question: 'What unit do you prefer for weight?' },
  distance: { units: ['km', 'miles', 'meters', 'feet'], question: 'What unit do you prefer for distance?' },
  time: { units: ['minutes', 'hours', 'seconds'], question: 'What time unit works best for this?' },
  currency: { units: ['$', '€', '£', '¥', 'custom'], question: 'What currency should be used?' },
  temperature: { units: ['°C', '°F'], question: 'Celsius or Fahrenheit?' },
};

// Calculate entropy-based ambiguity score
function calculateAmbiguityScore(input: string): number {
  const words = input.toLowerCase().split(/\s+/);
  let ambiguityScore = 0;
  
  // Factor 1: Length (too short = ambiguous)
  const lengthFactor = Math.max(0, 1 - (words.length / 15));
  ambiguityScore += lengthFactor * 0.3;
  
  // Factor 2: Presence of vague words
  const vagueWordCount = words.filter(w => AMBIGUOUS_WORDS.includes(w)).length;
  ambiguityScore += Math.min(vagueWordCount / 5, 0.3);
  
  // Factor 3: Presence of vague phrases
  const lowerInput = input.toLowerCase();
  const vaguePhraseCount = VAGUE_PHRASES.filter(p => lowerInput.includes(p)).length;
  ambiguityScore += Math.min(vaguePhraseCount / 4, 0.2);
  
  // Factor 4: Missing specifics (no numbers, no time references)
  const hasNumbers = /\d+/.test(input);
  const hasTimeRef = /(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|hour|minute|daily|weekly|morning|evening|night)/i.test(input);
  if (!hasNumbers) ambiguityScore += 0.1;
  if (!hasTimeRef && /remind|notification|alert|schedule/i.test(input)) ambiguityScore += 0.1;
  
  // Factor 5: Domain clarity
  const detectedDomains = detectDomains(input);
  if (detectedDomains.length === 0) ambiguityScore += 0.15;
  if (detectedDomains.length > 2) ambiguityScore += 0.1; // Multiple domains = unclear
  
  return Math.min(ambiguityScore, 1);
}

// Detect which domains the input relates to
function detectDomains(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const detected: string[] = [];
  
  for (const [domain, keywords] of Object.entries(DOMAIN_PATTERNS)) {
    if (keywords.some(kw => lowerInput.includes(kw))) {
      detected.push(domain);
    }
  }
  
  return detected;
}

// Detect what units might be needed
function detectNeededUnits(input: string): string[] {
  const lowerInput = input.toLowerCase();
  const neededUnits: string[] = [];
  
  if (/water|hydrat|drink|fluid/i.test(input)) neededUnits.push('water');
  if (/weight|weigh|mass|heavy/i.test(input)) neededUnits.push('weight');
  if (/distance|run|walk|mile|kilometer|travel/i.test(input)) neededUnits.push('distance');
  if (/money|cost|price|budget|expense|dollar|euro/i.test(input)) neededUnits.push('currency');
  if (/temperature|temp|weather|hot|cold/i.test(input)) neededUnits.push('temperature');
  
  return neededUnits;
}

// Generate clarifying questions based on detected ambiguities
function generateClarificationQuestions(input: string, domains: string[], ambiguityScore: number): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = [];
  const lowerInput = input.toLowerCase();
  
  // Question 1: Domain clarification if multiple or none detected
  if (domains.length === 0) {
    questions.push({
      id: 'domain',
      question: 'What category best describes what you want to create?',
      options: ['Health & Fitness', 'Productivity & Tasks', 'Finance & Budget', 'Learning & Education', 'Spiritual & Mindfulness', 'Sports & Games', 'Home & Lifestyle', 'Other'],
      inputType: 'select',
      required: true,
      category: 'domain',
    });
  } else if (domains.length > 1) {
    questions.push({
      id: 'domain_clarify',
      question: `Your request could relate to multiple areas. What's the primary focus?`,
      options: domains.map(d => d.charAt(0).toUpperCase() + d.slice(1)),
      inputType: 'select',
      required: true,
      category: 'domain',
    });
  }
  
  // Question 2: Unit preferences
  const neededUnits = detectNeededUnits(input);
  for (const unitType of neededUnits) {
    const unitInfo = UNIT_DOMAINS[unitType];
    if (unitInfo && !unitInfo.units.some(u => lowerInput.includes(u.toLowerCase()))) {
      questions.push({
        id: `unit_${unitType}`,
        question: unitInfo.question,
        options: unitInfo.units,
        inputType: 'select',
        required: true,
        category: 'units',
      });
    }
  }
  
  // Question 3: Frequency/timing for reminders
  if (/remind|notification|alert|schedule/i.test(input) && !/\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|every\s+\d+/i.test(input)) {
    questions.push({
      id: 'frequency',
      question: 'How often should you be reminded?',
      options: ['Every hour', 'Every 2 hours', 'Every 4 hours', '3 times a day', 'Once daily', 'Custom times'],
      inputType: 'select',
      required: true,
      category: 'frequency',
    });
    
    if (!/morning|afternoon|evening|night|\d{1,2}(:\d{2})?\s*(am|pm)/i.test(input)) {
      questions.push({
        id: 'time_range',
        question: 'What time range should reminders be active?',
        options: ['All day (6am-10pm)', 'Morning only (6am-12pm)', 'Work hours (9am-5pm)', 'Evening only (5pm-10pm)', 'Custom range'],
        inputType: 'select',
        required: false,
        category: 'frequency',
      });
    }
  }
  
  // Question 4: Goal/target for trackers
  if (/track|log|monitor|count|record/i.test(input) && !/goal|target|\d+\s*(ml|oz|cups|steps|minutes|hours)/i.test(input)) {
    questions.push({
      id: 'daily_goal',
      question: 'Do you have a daily goal or target?',
      options: ['Yes, let me specify', 'Use recommended default', 'No goal, just track'],
      inputType: 'select',
      required: false,
      category: 'data',
    });
  }
  
  // Question 5: Data visualization preferences
  if (/track|log|monitor|history|progress/i.test(input)) {
    questions.push({
      id: 'visualization',
      question: 'How would you like to see your progress?',
      options: ['Daily summary', 'Weekly charts', 'Monthly calendar view', 'All of the above'],
      inputType: 'select',
      required: false,
      category: 'ui',
    });
  }
  
  // Question 6: Additional features
  if (ambiguityScore > 0.5 || domains.length === 0) {
    questions.push({
      id: 'features',
      question: 'What features are most important to you?',
      options: ['Simple and minimal', 'Detailed statistics', 'Notifications/reminders', 'History and trends', 'Sharing/export'],
      inputType: 'multiselect',
      required: false,
      category: 'features',
    });
  }
  
  // Limit to most relevant questions (max 4 for UX)
  return questions.slice(0, 4);
}

// Main analysis function - uses neurosymbolic AI for deterministic analysis
export async function analyzePromptForClarification(userInput: string): Promise<ClarificationResult> {
  const input = userInput.trim();
  
  if (!input || input.length < 3) {
    return {
      needsClarification: true,
      ambiguityScore: 1,
      detectedIntent: 'unknown',
      questions: [{
        id: 'what',
        question: 'What would you like your app to do?',
        inputType: 'text',
        placeholder: 'e.g., Track my daily water intake with hourly reminders',
        required: true,
        category: 'domain',
      }],
      suggestions: [],
      confidence: 0,
    };
  }
  
  // Initialize neurosymbolic system
  await ensureNeuroInitialized();
  
  // Calculate local ambiguity score (rule-based backup)
  const localAmbiguityScore = calculateAmbiguityScore(input);
  const domains = detectDomains(input);
  
  console.log('[ClarificationEngine] Local ambiguity score:', localAmbiguityScore, 'Domains:', domains);
  
  // Use neurosymbolic ambiguity detection if available
  try {
    const neuroAnalysis = await AmbiguityDetector.analyze(input);
    console.log('[ClarificationEngine] Neurosymbolic analysis:', {
      isAmbiguous: neuroAnalysis.isAmbiguous,
      score: neuroAnalysis.overallScore,
      ambiguities: neuroAnalysis.ambiguities.length,
      autoResolved: neuroAnalysis.autoResolutions.length,
    });
    
    // Convert neurosymbolic questions to our format
    const neuroQuestions = convertNeuroQuestions(neuroAnalysis.clarificationQuestions);
    
    // If not ambiguous or auto-resolved, generate deterministic prompt
    if (!neuroAnalysis.isAmbiguous || neuroAnalysis.clarificationQuestions.length === 0) {
      const deterministicPrompt = await DeterministicPromptGenerator.generatePrompt(input);
      console.log('[ClarificationEngine] Deterministic prompt generated, confidence:', deterministicPrompt.confidence);
      
      return {
        needsClarification: false,
        ambiguityScore: neuroAnalysis.overallScore,
        detectedIntent: deterministicPrompt.domain || domains[0] || 'general',
        questions: [],
        suggestions: neuroAnalysis.autoResolutions.map(r => `${r.ambiguityText}: ${r.resolvedTo}`),
        enhancedPrompt: deterministicPrompt.prompt,
        confidence: deterministicPrompt.confidence,
      };
    }
    
    // Has ambiguity - return clarification questions
    return {
      needsClarification: true,
      ambiguityScore: neuroAnalysis.overallScore,
      detectedIntent: domains[0] || 'general',
      questions: neuroQuestions.slice(0, 4), // Max 4 for UX
      suggestions: neuroAnalysis.autoResolutions.map(r => `${r.ambiguityText}: ${r.resolvedTo}`),
      confidence: neuroAnalysis.confidence,
    };
    
  } catch (neuroError) {
    console.warn('[ClarificationEngine] Neurosymbolic analysis failed, using fallback:', neuroError);
  }
  
  // Fallback to original logic
  // For clear inputs (low ambiguity), skip clarification
  if (localAmbiguityScore < 0.3 && domains.length === 1) {
    return {
      needsClarification: false,
      ambiguityScore: localAmbiguityScore,
      detectedIntent: domains[0],
      questions: [],
      suggestions: [],
      confidence: 1 - localAmbiguityScore,
    };
  }
  
  // For moderate ambiguity, use AI-powered analysis
  if (localAmbiguityScore >= 0.3 || domains.length !== 1) {
    try {
      const aiAnalysis = await analyzeWithAI(input, localAmbiguityScore, domains);
      return aiAnalysis;
    } catch (error) {
      console.warn('[ClarificationEngine] AI analysis failed, using fallback:', error);
    }
  }
  
  // Fallback to rule-based questions
  const questions = generateClarificationQuestions(input, domains, localAmbiguityScore);
  
  return {
    needsClarification: questions.length > 0,
    ambiguityScore: localAmbiguityScore,
    detectedIntent: domains[0] || 'general',
    questions,
    suggestions: [],
    confidence: 1 - localAmbiguityScore,
  };
}

// Convert neurosymbolic questions to our format
function convertNeuroQuestions(neuroQuestions: NeuroQuestion[]): ClarificationQuestion[] {
  return neuroQuestions.map(nq => {
    let inputType: ClarificationQuestion['inputType'] = 'text';
    let category: ClarificationQuestion['category'] = 'domain';
    
    // Map neurosymbolic types to our types
    switch (nq.type) {
      case 'single_choice':
        inputType = 'select';
        break;
      case 'multiple_choice':
        inputType = 'multiselect';
        break;
      case 'number':
        inputType = 'number';
        break;
      case 'time':
        inputType = 'time';
        break;
      default:
        inputType = 'text';
    }
    
    // Infer category from question content
    const questionLower = nq.question.toLowerCase();
    if (questionLower.includes('unit')) category = 'units';
    else if (questionLower.includes('often') || questionLower.includes('remind') || questionLower.includes('frequency')) category = 'frequency';
    else if (questionLower.includes('feature')) category = 'features';
    else if (questionLower.includes('goal') || questionLower.includes('target')) category = 'data';
    else if (questionLower.includes('view') || questionLower.includes('display')) category = 'ui';
    
    return {
      id: nq.id,
      question: nq.question,
      options: nq.options?.map(o => o.label),
      inputType,
      placeholder: nq.placeholder,
      defaultValue: nq.defaultValue,
      required: nq.required,
      category,
    };
  });
}

// AI-powered analysis for complex cases
async function analyzeWithAI(input: string, localAmbiguityScore: number, detectedDomains: string[]): Promise<ClarificationResult> {
  if (!XAI_API_KEY) {
    throw new Error('API key not available');
  }
  
  const systemPrompt = `You are a smart intent clarification engine. Analyze the user's app request and determine if clarification is needed.

TASK: Analyze the input for ambiguity and generate targeted clarifying questions if needed.

INPUT CONTEXT:
- Local ambiguity score: ${localAmbiguityScore.toFixed(2)} (0=clear, 1=very ambiguous)
- Detected domains: ${detectedDomains.join(', ') || 'none'}

OUTPUT FORMAT (JSON only, no markdown):
{
  "needsClarification": boolean,
  "ambiguityScore": number (0-1),
  "detectedIntent": "string describing main intent",
  "confidence": number (0-1),
  "questions": [
    {
      "id": "unique_id",
      "question": "Clear, specific question",
      "options": ["Option 1", "Option 2"] or null for text input,
      "inputType": "select" | "text" | "number" | "time" | "multiselect",
      "placeholder": "hint text for text inputs",
      "required": boolean,
      "category": "domain" | "units" | "frequency" | "features" | "data" | "ui"
    }
  ],
  "suggestions": ["auto-fill suggestion 1", "suggestion 2"],
  "enhancedPrompt": "If no clarification needed, provide an enhanced version of the prompt"
}

RULES:
1. Only ask questions that CANNOT be reasonably assumed
2. Maximum 3 questions to avoid user fatigue
3. Prefer select/multiselect over text when options are finite
4. If the request is reasonably clear, set needsClarification to false and provide enhancedPrompt
5. Questions should be conversational and helpful, not interrogative
6. Include smart suggestions when possible

EXAMPLES OF CLEAR vs AMBIGUOUS:
- CLEAR: "Track my water intake in ml with 250ml, 500ml, 1L buttons and remind me every 2 hours from 8am to 8pm"
- AMBIGUOUS: "water tracker" (missing: units, goals, reminder frequency, time range)
- AMBIGUOUS: "remind me to drink" (missing: what to drink, how often, when)

Analyze this user input:`;

  const response = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'grok-3-fast',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: input },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  
  // Parse JSON response
  const cleaned = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const result = JSON.parse(cleaned) as ClarificationResult;
  
  console.log('[ClarificationEngine] AI analysis:', result);
  
  return result;
}

// Merge user answers back into enhanced prompt
export function buildEnhancedPrompt(
  originalInput: string, 
  answers: ClarificationAnswers,
  questions: ClarificationQuestion[]
): string {
  let enhanced = originalInput;
  const additions: string[] = [];
  
  for (const question of questions) {
    const answer = answers[question.id];
    if (!answer) continue;
    
    switch (question.category) {
      case 'domain':
        additions.push(`Focus area: ${answer}`);
        break;
      case 'units':
        additions.push(`Use ${answer} as the unit`);
        break;
      case 'frequency':
        if (typeof answer === 'string') {
          if (answer.includes('hour')) {
            additions.push(`Remind ${answer.toLowerCase()}`);
          } else if (answer.includes('daily')) {
            additions.push(`Send daily reminder`);
          } else if (answer.includes('Custom')) {
            additions.push(`Allow custom reminder times`);
          } else {
            additions.push(`Reminder frequency: ${answer}`);
          }
        }
        break;
      case 'features':
        if (Array.isArray(answer)) {
          additions.push(`Include features: ${answer.join(', ')}`);
        } else {
          additions.push(`Feature preference: ${answer}`);
        }
        break;
      case 'data':
        if (answer === 'Yes, let me specify') {
          additions.push(`Include a customizable daily goal`);
        } else if (answer === 'Use recommended default') {
          additions.push(`Use recommended daily goal`);
        }
        break;
      case 'ui':
        additions.push(`Visualization: ${answer}`);
        break;
    }
  }
  
  if (additions.length > 0) {
    enhanced = `${originalInput}. ${additions.join('. ')}.`;
  }
  
  return enhanced;
}

// Quick validation for common patterns
export function getQuickSuggestions(input: string): string[] {
  const suggestions: string[] = [];
  const lower = input.toLowerCase();
  
  if (lower.includes('water') && !lower.includes('ml') && !lower.includes('oz')) {
    suggestions.push('Add "in ml" or "in oz" to specify units');
  }
  
  if (lower.includes('remind') && !/\d/.test(input)) {
    suggestions.push('Add specific times like "every 2 hours from 8am to 8pm"');
  }
  
  if ((lower.includes('track') || lower.includes('log')) && !lower.includes('goal')) {
    suggestions.push('Consider adding a daily goal');
  }
  
  return suggestions;
}
