import Constants from 'expo-constants';

const XAI_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_XAI_API_KEY ||
  process.env.EXPO_PUBLIC_XAI_API_KEY;

// Fallback to Claude if available
const CLAUDE_API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  Constants.manifest?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;

if (XAI_API_KEY) {
  console.log('[OracleCodeGenerator] xAI API Key found:', XAI_API_KEY.substring(0, 10) + '...');
} else if (CLAUDE_API_KEY) {
  console.log('[OracleCodeGenerator] Claude API Key found:', CLAUDE_API_KEY.substring(0, 10) + '...');
} else {
  console.error('[OracleCodeGenerator] No API key found!');
}

const SYSTEM_PROMPT = `You are a senior React Native/Expo developer. Generate complete, valid React Native components for Expo.

CRITICAL RULES:
1. Return ONLY the component code, no markdown fences
2. Use a single default export at the end
3. Do NOT include import statements - all dependencies are pre-injected
4. Do NOT include Firebase configuration or initialization code - Firebase is pre-configured
5. ALWAYS initialize arrays with default values: useState([]) not useState()
6. ALWAYS handle undefined/null states before accessing properties like .length or .map()
7. Use optional chaining (?.) and nullish coalescing (??) liberally
8. Initialize all state with sensible defaults

STYLESHEET RULES (ABSOLUTELY CRITICAL - READ CAREFULLY):
- fontWeight MUST ALWAYS be a quoted string, NEVER a bare number
- CORRECT EXAMPLES:
  fontWeight: '400'
  fontWeight: '500'
  fontWeight: '600'
  fontWeight: '700'
  fontWeight: 'bold'
- WRONG EXAMPLES (NEVER DO THESE):
  fontWeight: 600  (missing quotes)
  fontWeight:600"  (malformed)
  fontWeight: 600" (missing opening quote)
- Double-check every fontWeight in your StyleSheet

STRING FORMATTING RULES (CRITICAL):
- When including references like "Psalm 23:1" or "John 3:16", keep the colon and number together
- CORRECT: 'The Lord is my shepherd - Psalm 23:1'
- WRONG: 'The Lord is my shepherd - Psalm 23: 1' (space after colon breaks parsing)
- Always use consistent quotes, prefer single quotes for strings

AVAILABLE DEPENDENCIES (pre-injected, do not import):
- React hooks: React, useState, useEffect, useMemo, useCallback, useRef
- RN components: View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList, Modal, Switch, Alert, Animated, ActivityIndicator, SafeAreaView, Button, Pressable
- Storage: AsyncStorage
- Notifications: Notifications (use Notifications.scheduleNotificationAsync)
- Charts: LineChart, BarChart, PieChart (from react-native-chart-kit)
- Icons: All Lucide icons (Check, Plus, Minus, Trash2, Clock, Bell, etc.)
- Firebase: database, db, ref, set, push, onValue (pre-initialized, just use directly)
- Theme: colors object with primary, background, text, etc.
- Helpers: safeArray(x), safeLength(x), safeNumber(x), safeString(x), safeObject(x), safeFilter(arr, fn), safeMap(arr, fn)

EXAMPLE STATE INITIALIZATION:
const [items, setItems] = useState([]); // Always initialize arrays
const [data, setData] = useState({ shifts: [], total: 0 }); // Initialize objects with structure
const [count, setCount] = useState(0); // Initialize numbers

EXAMPLE SAFE ACCESS:
const length = (items || []).length; // OR use safeLength(items)
const mapped = (items || []).map(...); // OR use safeArray(items).map(...)
const filtered = safeFilter(items, item => item.active);
const value = data?.nested?.property ?? 'default';

DO NOT GENERATE:
- import statements
- firebaseConfig objects
- initializeApp() or getDatabase() calls
- require() calls`;

async function callGrokAPI(userPrompt: string): Promise<string> {
  if (!XAI_API_KEY && !CLAUDE_API_KEY) {
    throw new Error('No API key found. Check your .env file.');
  }

  console.log('[OracleCodeGenerator] Generating code for:', userPrompt);

  const useXAI = !!XAI_API_KEY;

  if (useXAI) {
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-3',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OracleCodeGenerator] xAI API error:', errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json();
    const code = data.choices?.[0]?.message?.content || '';
    console.log('[OracleCodeGenerator] Generated code length:', code.length);
    return code;
  } else {
    // Claude fallback
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OracleCodeGenerator] Claude API error:', errorText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const code = data.content?.[0]?.text || '';
    console.log('[OracleCodeGenerator] Generated code length:', code.length);
    return code;
  }
}

function cleanGeneratedCode(rawCode: string): string {
  let cleaned = rawCode;

  // Remove markdown code fences
  cleaned = cleaned.replace(/```(?:typescript|tsx|jsx|javascript|js)?\s*/g, '');
  cleaned = cleaned.replace(/```\s*$/g, '');

  // Remove import statements (all dependencies are injected)
  cleaned = cleaned.replace(/^import\s+.+?from\s+['"][^'"]+['"];?\s*$/gm, '');
  cleaned = cleaned.replace(/^import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"];?\s*$/gm, '');

  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();

  console.log('[OracleCodeGenerator] Cleaned code preview:', cleaned.substring(0, 200) + '...');
  return cleaned;
}

// System prompt for refining user ideas into detailed prompts
const REFINE_PROMPT_SYSTEM = `You are a prompt engineer for an AI oracle/mini-app builder. Your job is to take a user's simple idea and transform it into a detailed, effective prompt that will help generate a better React Native component.

When refining prompts, consider adding:
- Firebase Realtime Database persistence for trackers/lists (use 'database', 'ref', 'set', 'onValue' which are pre-injected)
- expo-notifications for reminders/alerts (use 'Notifications.scheduleNotificationAsync')
- react-native-chart-kit for data visualization (LineChart, BarChart, PieChart are available)
- AsyncStorage for local persistence
- Proper state initialization with useState([]) for arrays
- Custom UI layouts with proper styling
- Input validation and error handling
- Lucide icons for visual polish

OUTPUT RULES:
- Return ONLY the refined prompt text, no explanations
- Keep it concise but detailed (2-4 sentences max)
- Focus on features that make the app useful
- Don't include technical implementation details like "use useState"`;

export async function refinePrompt(userIdea: string): Promise<string> {
  if (!XAI_API_KEY && !CLAUDE_API_KEY) {
    throw new Error('No API key found. Check your .env file.');
  }

  console.log('[OracleCodeGenerator] Refining prompt for:', userIdea);

  const useXAI = !!XAI_API_KEY;

  try {
    if (useXAI) {
      const response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${XAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'grok-3',
          messages: [
            { role: 'system', content: REFINE_PROMPT_SYSTEM },
            { role: 'user', content: `User idea: ${userIdea}` },
          ],
          temperature: 0.7,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const refined = data.choices?.[0]?.message?.content || '';
      console.log('[OracleCodeGenerator] Refined prompt:', refined);
      return refined.trim();
    } else {
      // Claude fallback
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CLAUDE_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: REFINE_PROMPT_SYSTEM,
          messages: [
            { role: 'user', content: `User idea: ${userIdea}` },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.status}`);
      }

      const data = await response.json();
      const refined = data.content?.[0]?.text || '';
      console.log('[OracleCodeGenerator] Refined prompt:', refined);
      return refined.trim();
    }
  } catch (error: any) {
    console.error('[OracleCodeGenerator] Refine failed:', error);
    throw new Error('Failed to refine prompt. Please try again.');
  }
}

export async function generateOracleCode(userPrompt: string): Promise<string> {
  const MAX_RETRIES = 2;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawCode = await callGrokAPI(userPrompt);
      const cleanedCode = cleanGeneratedCode(rawCode);

      if (!cleanedCode || cleanedCode.length < 100) {
        throw new Error('Generated code is too short or empty');
      }

      if (!cleanedCode.includes('export default')) {
        throw new Error('Generated code missing default export');
      }

      console.log('[OracleCodeGenerator] ✓ Valid code generated');
      return cleanedCode;
    } catch (error: any) {
      console.error(`[OracleCodeGenerator] Attempt ${attempt} failed:`, error.message);

      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to generate oracle code. Please try rephrasing your request.');
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }

  throw new Error('Failed to generate oracle code after all retries');
}
