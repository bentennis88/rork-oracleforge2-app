import type { OracleConfig, OracleType } from '@/oracles/types';

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export type GenerateOracleConfigResult = {
  config: OracleConfig;
  conversationHistory: ChatMessage[];
};

const SYSTEM_PROMPT = `You are OracleForge's config generator.

Your job: output EXACTLY ONE JSON object describing an OracleConfig.
You MUST NOT output code, JSX, markdown fences, comments, or explanations.

CRITICAL OUTPUT RULES:
- Output must be valid JSON that succeeds with JSON.parse(output).
- Output must be a single JSON object (not an array).
- No trailing commas. Use double quotes for all keys/strings.
- Do NOT wrap in ``` fences. Do NOT include any extra text.

SCHEMA (OracleConfig):
- Common fields:
  - "id": string (use "draft")
  - "title": string
  - "description": string (optional)
  - "type": "tracker" | "reminder" | "calculator"

- ReminderOracleConfig (type="reminder"):
  - "message": string
  - "startHour": number (0-23)
  - "endHour": number (0-23, >= startHour recommended)
  - "intervalMinutes": number (15-180)

- TrackerOracleConfig (type="tracker"):
  - "unit": string
  - "dailyGoal": number (> 0)
  - "incrementOptions": number[] (1-8 items, each > 0)
  - "chartWindowDays": number (7 recommended)

- CalculatorOracleConfig (type="calculator"):
  - "inputs": [{ "key": string, "label": string, "unit"?: string, "defaultValue"?: number }]
  - "formula": string
    - Allowed tokens: numbers, input keys (like a,b,c), + - * / **, parentheses, whitespace

DEFAULTS (use if user is vague):
- tracker: unit "", dailyGoal 10, incrementOptions [1,2,4], chartWindowDays 7
- reminder: message "Reminder", startHour 8, endHour 18, intervalMinutes 60
- calculator: 3 inputs (a,b,c) and formula "(a + b + c)"

Choose the type that best matches the user's prompt.`;

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function ensureString(v: unknown, fallback: string) {
  return typeof v === 'string' && v.trim().length ? v : fallback;
}

function normalizeOracleConfig(raw: any): OracleConfig {
  const type = raw?.type as OracleType;
  const base = {
    id: ensureString(raw?.id, 'draft'),
    title: ensureString(raw?.title, 'Oracle'),
    description: typeof raw?.description === 'string' ? raw.description : undefined,
    type,
  };

  if (type === 'reminder') {
    return {
      ...base,
      type: 'reminder',
      message: ensureString(raw?.message, 'Reminder'),
      startHour: clamp(Number(raw?.startHour ?? 8), 0, 23),
      endHour: clamp(Number(raw?.endHour ?? 18), 0, 23),
      intervalMinutes: clamp(Number(raw?.intervalMinutes ?? 60), 15, 180),
    } as OracleConfig;
  }

  if (type === 'calculator') {
    const inputsRaw = Array.isArray(raw?.inputs) ? raw.inputs : [];
    const inputs = inputsRaw
      .map((i: any) => ({
        key: ensureString(i?.key, ''),
        label: ensureString(i?.label, ''),
        unit: typeof i?.unit === 'string' && i.unit.trim().length ? i.unit : undefined,
        defaultValue: typeof i?.defaultValue === 'number' && Number.isFinite(i.defaultValue) ? i.defaultValue : undefined,
      }))
      .filter((i: any) => i.key && i.label)
      .slice(0, 8);

    return {
      ...base,
      type: 'calculator',
      inputs: inputs.length ? inputs : [{ key: 'a', label: 'A', defaultValue: 10 }, { key: 'b', label: 'B', defaultValue: 5 }, { key: 'c', label: 'C', defaultValue: 2 }],
      formula: ensureString(raw?.formula, '(a + b + c)'),
    } as OracleConfig;
  }

  const incRaw = Array.isArray(raw?.incrementOptions) ? raw.incrementOptions : [1, 2, 4];
  const incrementOptions = incRaw
    .map((n: any) => (typeof n === 'number' ? n : parseFloat(String(n))))
    .filter((n: number) => Number.isFinite(n) && n > 0)
    .slice(0, 8);

  return {
    ...base,
    type: 'tracker',
    unit: typeof raw?.unit === 'string' ? raw.unit : '',
    dailyGoal: clamp(Number(raw?.dailyGoal ?? 10), 1, 1_000_000),
    incrementOptions: incrementOptions.length ? incrementOptions : [1, 2, 4],
    chartWindowDays: clamp(Number(raw?.chartWindowDays ?? 7), 3, 30),
  } as OracleConfig;
}

function assertOracleConfig(config: OracleConfig) {
  if (!config || typeof config !== 'object') throw new Error('Config is not an object');
  if (config.type !== 'tracker' && config.type !== 'reminder' && config.type !== 'calculator') {
    throw new Error('Invalid config.type');
  }
  if (typeof config.id !== 'string' || typeof config.title !== 'string') {
    throw new Error('Missing required base fields');
  }
}

async function callForJson(messages: ChatMessage[]) {
  const promptBody = [SYSTEM_PROMPT, ''];
  for (const m of messages) {
    promptBody.push(`${m.role.toUpperCase()}: ${m.content}`);
  }
  const combinedPrompt = promptBody.join('\n\n');

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3.1',
      prompt: combinedPrompt,
      options: { temperature: 0.7 },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama generation failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  // Expecting { response: "..." } per provided snippet
  const text = (data?.response && typeof data.response === 'string') ? data.response.trim() : '';
  return text;
}

export async function generateOracleConfig(
  prompt: string,
  conversationHistory: ChatMessage[] = []
): Promise<GenerateOracleConfigResult> {
  const messages: ChatMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      content: `User prompt: ${JSON.stringify(prompt)}\n\nReturn ONLY the JSON OracleConfig object.`,
    },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callForJson(messages);
    try {
      const parsed = JSON.parse(raw);
      const config = normalizeOracleConfig(parsed);
      assertOracleConfig(config);
      return { config, conversationHistory: [...messages, { role: 'assistant', content: raw }] };
    } catch (e: any) {
      const errMsg = e?.message ? String(e.message) : String(e);
      messages.push({
        role: 'user',
        content:
          `Your previous response failed JSON.parse with error: ${JSON.stringify(errMsg)}.\n` +
          `Return ONLY valid JSON (no markdown, no extra text).`,
      });
    }
  }

  throw new Error('Failed to generate a valid JSON OracleConfig');
}

export async function refineOracleConfig(
  currentConfig: OracleConfig,
  feedback: string,
  conversationHistory: ChatMessage[] = []
): Promise<GenerateOracleConfigResult> {
  const messages: ChatMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      content:
        `Current OracleConfig (JSON):\n${JSON.stringify(currentConfig)}\n\n` +
        `User feedback: ${JSON.stringify(feedback)}\n\n` +
        `Update the config accordingly. Return ONLY the JSON OracleConfig object.`,
    },
  ];

  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callForJson(messages);
    try {
      const parsed = JSON.parse(raw);
      const config = normalizeOracleConfig(parsed);
      assertOracleConfig(config);
      return { config, conversationHistory: [...messages, { role: 'assistant', content: raw }] };
    } catch (e: any) {
      const errMsg = e?.message ? String(e.message) : String(e);
      messages.push({
        role: 'user',
        content:
          `Your previous response failed JSON.parse with error: ${JSON.stringify(errMsg)}.\n` +
          `Return ONLY valid JSON (no markdown, no extra text).`,
      });
    }
  }

  throw new Error('Failed to refine into a valid JSON OracleConfig');
}
