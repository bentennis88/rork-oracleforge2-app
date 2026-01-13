import Constants from 'expo-constants';
import type { OracleConfig } from '@/contexts/OraclesContext';

const ANTHROPIC_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are an "Oracle Intent Engine" that translates user input into structured oracle configurations.

ORACLE TYPES:
1. "tracker" - Track metrics over time (water intake, workouts, habits, etc.)
2. "reminder" - Send periodic reminders (medication, check-ins, tasks, etc.)
3. "calculator" - Perform calculations (savings, BMI, conversions, etc.)

OUTPUT FORMAT:
Return ONLY a JSON object matching ONE of these structures:

TRACKER:
{
  "type": "tracker",
  "metric": "water",
  "unit": "ml",
  "dailyGoal": 2000
}

REMINDER:
{
  "type": "reminder",
  "message": "Take medication",
  "startHour": 8,
  "endHour": 20,
  "interval": 480
}

CALCULATOR:
{
  "type": "calculator",
  "formula": "principal * (1 + rate) ^ years",
  "inputs": [
    { "key": "principal", "label": "Initial Amount" },
    { "key": "rate", "label": "Interest Rate (%)" },
    { "key": "years", "label": "Years" }
  ]
}

RULES:
- Return ONLY valid JSON (no markdown, no explanation, no code fences)
- Choose the most appropriate type based on user intent
- Use sensible defaults for all fields
- For trackers: common units (ml, steps, hours, reps, etc.)
- For reminders: interval in minutes (e.g., 480 = 8 hours)
- For calculators: simple formulas using standard operators (+, -, *, /, ^)

EXAMPLES:
User: "Track my daily water intake"
→ {"type":"tracker","metric":"water","unit":"ml","dailyGoal":2000}

User: "Remind me to take medicine every 8 hours from 8am to 8pm"
→ {"type":"reminder","message":"Take medicine","startHour":8,"endHour":20,"interval":480}

User: "Calculate compound interest on savings"
→ {"type":"calculator","formula":"principal * (1 + rate/100) ^ years","inputs":[{"key":"principal","label":"Principal ($)"},{"key":"rate","label":"Interest Rate (%)"},{"key":"years","label":"Years"}]}
`;

async function callAnthropicAPI(userPrompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('Anthropic API key not found. Check your .env file.');
  }

  console.log('[OracleIntentEngine] Generating config for:', userPrompt);

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[OracleIntentEngine] API error:', errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';
  console.log('[OracleIntentEngine] Raw response:', text);
  return text;
}

function cleanJsonResponse(raw: string): string {
  // Remove markdown code fences
  let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  return cleaned;
}

function validateOracleConfig(config: any): config is OracleConfig {
  if (!config || typeof config !== 'object') return false;

  const { type } = config;

  if (type === 'tracker') {
    return (
      typeof config.metric === 'string' &&
      typeof config.unit === 'string' &&
      typeof config.dailyGoal === 'number'
    );
  }

  if (type === 'reminder') {
    return (
      typeof config.message === 'string' &&
      typeof config.startHour === 'number' &&
      typeof config.endHour === 'number' &&
      typeof config.interval === 'number'
    );
  }

  if (type === 'calculator') {
    return (
      typeof config.formula === 'string' &&
      Array.isArray(config.inputs) &&
      config.inputs.every(
        (inp: any) => typeof inp.key === 'string' && typeof inp.label === 'string'
      )
    );
  }

  return false;
}

export async function generateOracleConfig(userPrompt: string): Promise<OracleConfig> {
  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawResponse = await callAnthropicAPI(userPrompt);
      const cleanedResponse = cleanJsonResponse(rawResponse);

      console.log('[OracleIntentEngine] Cleaned response:', cleanedResponse);

      const parsed = JSON.parse(cleanedResponse);

      if (!validateOracleConfig(parsed)) {
        console.warn('[OracleIntentEngine] Invalid config structure:', parsed);
        throw new Error('AI returned invalid config structure');
      }

      console.log('[OracleIntentEngine] ✓ Valid config generated:', parsed);
      return parsed as OracleConfig;
    } catch (error: any) {
      console.error(`[OracleIntentEngine] Attempt ${attempt} failed:`, error.message);

      if (attempt === MAX_RETRIES) {
        throw new Error(
          'Failed to generate oracle config. Please try rephrasing your request.'
        );
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  // Fallback (should never reach here)
  throw new Error('Failed to generate oracle config after all retries');
}
