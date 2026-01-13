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

const SYSTEM_PROMPT = `You are an expert OracleForge React Native component generator. Generate complete, working, production-ready React Native "oracle" components.

ABSOLUTE OUTPUT RULES (MUST FOLLOW):
- Return ONLY the component code. NO markdown, NO explanations, NO backticks.
- Output must start with imports and end with a default export.
- The code MUST compile in Expo/React Native without edits.
- All JSX tags must be closed. All braces/parentheses/quotes must be balanced.
- StyleSheet objects must be valid JS (commas between entries).

EVAL-SAFE (CRITICAL):
- Your code will be dynamically transpiled and executed.
- NO top-level await.
- Async/await is allowed ONLY inside async functions.
- For mount-time async work: use useEffect(() => { (async function () { ... })(); }, []) OR Promise.then/catch inside useEffect.

PROPS:
Component receives props: { userId, oracleId, firebaseService }

ALLOWED IMPORTS (use only these, include all you use):
- React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
- View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions, Switch, Modal, ActivityIndicator from 'react-native'
- AsyncStorage from '@react-native-async-storage/async-storage'
- * as Notifications from 'expo-notifications'
- { LineChart, BarChart, PieChart } from 'react-native-chart-kit'
- Icons from 'lucide-react-native'

MANDATORY FEATURES (EVERY ORACLE MUST INCLUDE ALL):
1) PERSISTENCE (AsyncStorage + Firestore logs for trackers)
- Always persist core state with AsyncStorage.
- Use STRING CONCATENATION for AsyncStorage keys (NO template literals):
  const key = 'oracle_' + props.oracleId + '_data';
  await AsyncStorage.setItem(key, JSON.stringify(data));
  const saved = await AsyncStorage.getItem(key);
- For trackers (water/habit/workout/mood/finance/etc.) also log events via:
  await props.firebaseService.addOracleLog(props.oracleId, { type, value, timestamp, date, metadata });
  const logs = await props.firebaseService.getOracleLogs(props.oracleId, { startDate, endDate, type, limit });

2) NOTIFICATIONS (expo-notifications)
- Include an opt-in reminders system.
- Request permissions on mount.
- Provide UI to enable/disable reminders.
- Schedule notifications when enabled, cancel them when disabled.

3) CHART (react-native-chart-kit)
- Include at least one chart using REAL data from state/logs (not placeholder arrays).
- Use const screenWidth = Dimensions.get('window').width;
- Use chartConfig with string concatenation for rgba colors (avoid template literals).

COMPLEX LOGIC (MUST BE REAL, NOT ECHO):
Include at least THREE:
- Streaks (consecutive days)
- Projections/forecasting (ETA, trend, weekly projection)
- Rolling metrics (7-day avg / moving avg)
- Multi-session memory (persist settings + derived summaries)
- Validation/parsing (bounds, numeric parsing, dedupe)

UI REQUIREMENTS (VARIED + HIGH-TECH):
- Use a mix of cards + lists/grids (not a single plain form).
- Use StyleSheet with dark surfaces + neon accents + subtle shadows/elevation.
- Include loading states, error states, and empty states.
- Use at least 3 icons meaningfully.

REFERENCE: WATER REMINDER ORACLE
- Custom schedule: hourly (8am–6pm) OR custom times list.
- Log water intake events to Firestore (type: 'water_intake', value: ml, date: YYYY-MM-DD).
- Chart last 7 days intake vs goal.
- Streak = consecutive days meeting goal.
- Projection = at current pace, estimated time to hit goal today and/or weekly projection.

FINAL CHECK BEFORE OUTPUT:
- Imports correct and only from allowed list
- JSX closed, quotes/braces balanced, StyleSheet valid commas
- NO top-level await
- Includes AsyncStorage + notifications + chart + tracker logs (when applicable)

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
