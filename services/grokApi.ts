// services/grokApi.ts
import Anthropic from '@anthropic-ai/sdk';
import Constants from 'expo-constants';

// Try multiple ways to get the API key (Expo runtime varies by platform / build).
// NOTE: Do NOT hardcode API keys here. Use `.env` + `app.config.js` -> `expo.extra`.
const API_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  // @ts-expect-error - `manifest` is deprecated but still present in some Expo runtimes
  Constants.manifest?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  // @ts-expect-error - `manifest2` exists in some runtimes but isn't typed in all versions
  Constants.manifest2?.extra?.expoClient?.extra?.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ||
  '';

console.log('[GrokAPI] API Key loaded:', API_KEY ? 'Yes ✓' : 'No ✗');
console.log('[GrokAPI] API Key length:', API_KEY ? API_KEY.length : 0);

if (!API_KEY) {
  console.error(
    '[GrokAPI] ⚠️  No API key found! Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file'
  );
}

const anthropic = new Anthropic({
  apiKey: API_KEY,
});

function preprocessGeneratedCode(raw: string): string {
  const stripMarkdownCodeFences = (input: string): string => {
    const s = (input || '').trim();

    // Prefer extracting the longest fenced code block (Claude sometimes wraps code in ```javascript ... ```).
    const fenceRe = /```[ \t]*([a-zA-Z0-9_-]+)?[ \t]*\r?\n([\s\S]*?)\r?\n?```/g;
    const matches = Array.from(s.matchAll(fenceRe));
    if (matches.length > 0) {
      const best = matches.reduce((acc, cur) => {
        const curBody = cur[2] ?? '';
        const accBody = acc[2] ?? '';
        return curBody.length > accBody.length ? cur : acc;
      });
      return (best[2] ?? '').trim();
    }

    // If we have a starting fence but no ending fence, drop the first fence line and any trailing ``` at EOF.
    if (s.startsWith('```')) {
      const firstNewline = s.indexOf('\n');
      const withoutFirstLine = firstNewline >= 0 ? s.slice(firstNewline + 1) : '';
      return withoutFirstLine.replace(/\r?\n?```[ \t]*$/m, '').trim();
    }

    // Some models put ``` on same line as content; handle that too.
    const looseFence = s.match(/```[ \t]*([a-zA-Z0-9_-]+)?[ \t]*\r?\n?([\s\S]*?)```/);
    if (looseFence) return (looseFence[2] ?? '').trim();

    return s;
  };

  // Remove markdown code fences if present (robust to \r\n and language tags).
  let cleanCode = stripMarkdownCodeFences(raw);

  // Fix common Babel issues with template literals used as AsyncStorage keys.
  // Example: AsyncStorage.setItem(`oracle_${props.oracleId}_data`, ...)
  // ->       AsyncStorage.setItem('oracle_' + props.oracleId + '_data', ...)
  cleanCode = cleanCode.replace(
    /AsyncStorage\.(getItem|setItem|removeItem)\s*\(\s*`([^`]*?)`/g,
    (match, method, templateBody: string) => {
      if (!templateBody.includes('${')) return match;
      const parts = templateBody.split(/(\$\{[^}]+\})/g).filter(Boolean);
      const expr = parts
        .map(p => {
          const m = p.match(/^\$\{([\s\S]+)\}$/);
          if (m) return `(${m[1].trim()})`;
          return `'${p.replace(/'/g, "\\'")}'`;
        })
        .join(' + ');
      return `AsyncStorage.${method}(${expr}`;
    }
  );

  return cleanCode.trim();
}

const SYSTEM_PROMPT = `You are an expert React Native component generator. Generate complete, working React Native components.

CRITICAL: Return ONLY the component code. NO markdown, NO explanations, NO backticks.

Component receives props: { userId, oracleId, firebaseService }

AVAILABLE IMPORTS:
- React, { useState, useEffect, useCallback, useMemo } from 'react'
- View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions from 'react-native'
- AsyncStorage from '@react-native-async-storage/async-storage'
- * as Notifications from 'expo-notifications'
- { LineChart, BarChart, PieChart } from 'react-native-chart-kit'
- All icons from 'lucide-react-native' (Droplet, Bell, TrendingUp, etc.)

PERSISTENCE (IMPORTANT - Use string concatenation, NOT template literals):
\`\`\`javascript
// Save - use + for concatenation
await AsyncStorage.setItem('oracle_' + props.oracleId + '_data', JSON.stringify(data));
// Load
const saved = await AsyncStorage.getItem('oracle_' + props.oracleId + '_data');
const data = saved ? JSON.parse(saved) : defaultValue;
\`\`\`

NOTIFICATIONS:
\`\`\`javascript
useEffect(() => {
  Notifications.requestPermissionsAsync();
}, []);

await Notifications.scheduleNotificationAsync({
  content: { title: "Reminder", body: "Message" },
  trigger: { hour: 10, minute: 0, repeats: true }
});
\`\`\`

CHARTS:
\`\`\`javascript
const screenWidth = Dimensions.get('window').width;
<LineChart
  data={{ labels: ['Mon', 'Tue'], datasets: [{ data: [20, 45] }] }}
  width={screenWidth - 40}
  height={220}
  chartConfig={{
    backgroundColor: '#1e293b',
    backgroundGradientFrom: '#334155',
    backgroundGradientTo: '#1e293b',
    color: (opacity = 1) => 'rgba(34, 197, 94, ' + opacity + ')'
  }}
/>
\`\`\`

EXAMPLE for "water tracker":
- State: todayIntake, dailyGoal, weeklyData, streak, remindersEnabled
- AsyncStorage for persistence
- Notifications for hourly reminders
- LineChart for weekly progress
- UI: Progress circle, add buttons (250ml, 500ml, 1000ml), streak badge
- Colors: #22c55e (green), #1e293b (dark), modern gradients

CRITICAL: Do NOT use template literals in AsyncStorage.getItem() or AsyncStorage.setItem() calls.
Always use string concatenation with + operator instead.

Return ONLY the complete component code starting with imports.`;

interface GenerateResult {
  code: string;
  conversationHistory: Array<{ role: string; content: string }>;
}

export async function generateOracleCode(
  prompt: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<GenerateResult> {
  try {
    console.log('[GrokAPI] Generating oracle for prompt:', prompt);

    const messages = [
      ...conversationHistory,
      {
        role: 'user' as const,
        content: `Generate a React Native component for: "${prompt}"\n\nMake it functional with persistence, beautiful UI, and proper error handling. Return ONLY the code. IMPORTANT: Use string concatenation (+ operator) instead of template literals for AsyncStorage keys.`
      }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages,
    });

    const code = response.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    const cleanCode = preprocessGeneratedCode(code);

    console.log('[GrokAPI] Code cleaned, length:', cleanCode.length);

    return {
      code: cleanCode.trim(),
      conversationHistory: [...messages, { role: 'assistant', content: code }]
    };
  } catch (error: any) {
    console.error('[GrokAPI] Generation error:', error);
    throw new Error(`Failed to generate oracle: ${error.message}`);
  }
}

export async function refineOracleCode(
  currentCode: string,
  feedback: string,
  conversationHistory: Array<{ role: string; content: string }> = []
): Promise<GenerateResult> {
  try {
    console.log('[GrokAPI] Refining with feedback:', feedback);

    const messages = [
      ...conversationHistory,
      {
        role: 'user' as const,
        content: `Current code:\n\`\`\`\n${currentCode}\n\`\`\`\n\nUser feedback: "${feedback}"\n\nUpdate the component. Return ONLY the complete updated code. Use string concatenation (+ operator) for AsyncStorage keys, not template literals.`
      }
    ];

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages,
    });

    const code = response.content
      .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
      .map(c => c.text)
      .join('\n');

    const cleanCode = preprocessGeneratedCode(code);

    return {
      code: cleanCode.trim(),
      conversationHistory: [...messages, { role: 'assistant', content: code }]
    };
  } catch (error: any) {
    console.error('[GrokAPI] Refinement error:', error);
    throw new Error(`Failed to refine oracle: ${error.message}`);
  }
}
