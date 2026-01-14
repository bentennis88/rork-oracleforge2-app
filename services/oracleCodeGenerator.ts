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

const SYSTEM_PROMPT = `You are a senior React Native/Expo developer specializing in building complex internal oracles using AI. Your task is to generate complete React Native components – including UI, state management, logic, Firebase persistence, Expo notifications, and charts – based on user prompts. Prioritize code quality, error handling, and best practices. Use Expo Router for navigation. **Specifically, always ensure your output is valid JSX with properly closed tags, braces, and parentheses. Avoid eval() usage; instead, create functional components with hooks and use structured data for data transformations. Implement robust error handling with try/catch blocks and return appropriate error responses. Include comments to explain complex logic. Use Firebase Realtime Database for data persistence. Use Expo Notifications for scheduled reminders. Integrate react-native-chart-kit for data visualization. Return a fully functional React Native component, ready to be rendered within the DynamicOracleRenderer. **Do not return just code snippets; return the complete component structure.`;
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Droplet size={32} color="#0AFFE6" />
        <Text style={styles.title}>Water Tracker</Text>
      </View>

      <View style={styles.progressContainer}>
        <Text style={styles.intakeText}>{todayIntake} / {goal} ml</Text>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: progress + '%' }]} />
        </View>
        <Text style={styles.progressPercent}>{Math.round(progress)}%</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={() => addWater(250)}>
          <Text style={styles.buttonText}>+250ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => addWater(500)}>
          <Text style={styles.buttonText}>+500ml</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={() => addWater(1000)}>
          <Text style={styles.buttonText}>+1L</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Last 7 Days</Text>
        <LineChart
          data={{
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{ data: history.length ? history : [0] }],
          }}
          width={320}
          height={200}
          chartConfig={{
            backgroundColor: '#0A0A0A',
            backgroundGradientFrom: '#0A0A0A',
            backgroundGradientTo: '#141414',
            color: (opacity = 1) => 'rgba(10, 255, 230, ' + opacity + ')',
            strokeWidth: 2,
          }}
          style={styles.chart}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#FFFFFF' },
  progressContainer: { marginBottom: 24 },
  intakeText: { fontSize: 32, fontWeight: 'bold', color: '#0AFFE6', textAlign: 'center', marginBottom: 12 },
  progressBar: { height: 12, backgroundColor: '#1F1F1F', borderRadius: 6, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#0AFFE6' },
  progressPercent: { fontSize: 14, color: '#888888', textAlign: 'center', marginTop: 8 },
  buttons: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  button: { flex: 1, backgroundColor: '#0AFFE6', padding: 16, borderRadius: 12, alignItems: 'center' },
  buttonText: { fontSize: 16, fontWeight: '700', color: '#000000' },
  chartContainer: { marginTop: 16 },
  chartTitle: { fontSize: 18, fontWeight: '600', color: '#FFFFFF', marginBottom: 16 },
  chart: { borderRadius: 16 },
});

FINAL CHECKLIST:
✓ Valid, runnable React Native code
✓ One default export
✓ AsyncStorage for persistence
✓ Interactive UI with buttons/inputs
✓ Real functionality (not just config display)
✓ Error-free JSX (closed tags, balanced braces)
✓ No top-level await
✓ Beautiful styling
✓ NO markdown fences in output
`;

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
