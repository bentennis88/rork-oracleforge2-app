import Constants from 'expo-constants';
import { FormalVerifier, EdgeCaseHandler, CompatibilityChecker, TestGenerator } from './codeQuality';
import { SandboxedRuntime, SelfCorrectionEngine, PredictiveSimulator } from './sandbox';

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
  console.log('[OracleCodeGenerator] AI-ONLY MODE - No template fallbacks');
} else if (CLAUDE_API_KEY) {
  console.log('[OracleCodeGenerator] Claude API Key found:', CLAUDE_API_KEY.substring(0, 10) + '...');
  console.log('[OracleCodeGenerator] AI-ONLY MODE - No template fallbacks');
} else {
  console.error('[OracleCodeGenerator] No API key found!');
}

/**
 * Test API connectivity - call this to debug network issues
 */
export async function testApiConnection(): Promise<{ success: boolean; message: string; details?: any }> {
  console.log('[OracleCodeGenerator] Testing API connection...');
  console.log('[OracleCodeGenerator] API Key present:', !!XAI_API_KEY);
  console.log('[OracleCodeGenerator] API Key prefix:', XAI_API_KEY?.substring(0, 10) || 'MISSING');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout for test
    
    const response = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${XAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'grok-3-fast',
        messages: [{ role: 'user', content: 'Say "OK"' }],
        max_tokens: 5,
      }),
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OracleCodeGenerator] API test failed:', response.status, errorText);
      return { success: false, message: `API error: ${response.status}`, details: errorText };
    }
    
    const data = await response.json();
    console.log('[OracleCodeGenerator] API test successful:', data);
    return { success: true, message: 'API connection working', details: data };
  } catch (error: any) {
    console.error('[OracleCodeGenerator] API test error:', error);
    return { 
      success: false, 
      message: error.message || 'Unknown error',
      details: { name: error.name, cause: error.cause }
    };
  }
}

// Templates removed - AI-only mode
// Users get exactly what they ask for, no template suggestions

const SYSTEM_PROMPT = `You are a senior React Native/Expo developer creating PRODUCTION-QUALITY mini-apps. Generate complete, fully-functional React Native components that users will actually want to use daily.

PHILOSOPHY:
You are building REAL apps, not demos. Each oracle should be something users would pay for. Include all features needed for daily use. Think like a product designer - what would make this delightful?

ABSOLUTE CODE QUALITY REQUIREMENTS (NON-NEGOTIABLE):
Your code MUST be syntactically perfect and logically sound on the FIRST generation. No errors allowed.

1. SYNTAX PERFECTION:
   - Every bracket must be balanced: (), [], {}
   - Every string must be properly closed: '', "", \`\`
   - Every statement must end correctly
   - No trailing commas in invalid positions
   - fontWeight MUST be quoted: fontWeight: '600' (NOT 600)

2. NULL/UNDEFINED SAFETY (CRITICAL):
   - ALWAYS check arrays before .length, .map(), .filter(), .reduce()
   - Use optional chaining: data?.property
   - Use nullish coalescing: value ?? defaultValue
   - Initialize ALL state with proper defaults: useState([]), useState(0), useState('')
   - NEVER assume a variable has a value

3. TYPE SAFETY:
   - Numbers stay numbers, strings stay strings
   - parseInt/parseFloat for string-to-number conversion
   - toString() or String() for number-to-string
   - JSON.parse wrapped in try-catch

4. ASYNC SAFETY:
   - ALL async operations in try-catch blocks
   - State updates MUST check component mount status
   - Network calls MUST have timeout/error handling
   - Storage operations MUST handle failures gracefully

5. EDGE CASE HANDLING:
   - Empty arrays: Show "no data" state, don't crash
   - Invalid input: Validate and sanitize user input
   - Division: ALWAYS check for zero: value / (divisor || 1)
   - Array access: Check bounds before accessing by index
   - Date parsing: Validate dates before formatting

ARCHITECTURE PATTERN - MULTI-VIEW APPS:
Use a "currentView" state pattern to create multi-screen experiences within a single component:

const [currentView, setCurrentView] = useState('main'); // 'main', 'history', 'settings', 'detail'

// Render different views based on state
if (currentView === 'settings') return <SettingsView />;
if (currentView === 'history') return <HistoryView />;
return <MainView />;

CRITICAL RULES:
1. Return ONLY the component code, no markdown fences
2. Use a single default export at the end
3. Do NOT include import statements - all dependencies are pre-injected
4. ALWAYS initialize arrays: useState([])
5. ALWAYS handle null/undefined before .length or .map()
6. fontWeight MUST be a quoted string: fontWeight: '600' (NOT fontWeight: 600)

STRING AND DATA SAFETY (CRITICAL):
- ALWAYS use proper JavaScript string escaping in object literals
- Apostrophes in text MUST be escaped: "God's will" or 'God\\'s will'
- NEVER put multiple object properties on one line without proper quotes
- Use double quotes for strings containing apostrophes: "The Lord's Prayer"
- Example CORRECT: { id: '1', title: "Psalm 23:1", text: "The Lord is my shepherd" }
- Example WRONG: { id: '1', title: 'Psalm 23: 1, text: 'The Lord... (missing closing quote!)
- For sample data arrays, ALWAYS close each string property before the next property name

STORAGE RULES (CRITICAL):
- ALWAYS use AsyncStorage for data persistence, NEVER localStorage
- localStorage does not exist in React Native - it will cause errors
- Use: await AsyncStorage.getItem(key), await AsyncStorage.setItem(key, value)
- JSON data must be stringified: await AsyncStorage.setItem(key, JSON.stringify(data))

USEEFFECT DEPENDENCY RULES (CRITICAL - PREVENTS INFINITE LOOPS):
- Load data useEffect: ALWAYS use empty array [] - runs once on mount
- Timer/interval useEffect: Use [isRunning] only - the boolean that controls it
- Save data: Do NOT use useEffect for saving - call saveData function directly after setState
- NEVER put arrays or objects in dependency arrays unless they are refs
- NEVER call setState unconditionally inside useEffect

SAFE CODE PATTERNS (USE THESE):

// Safe array operations
const safeMap = (arr, fn) => (Array.isArray(arr) ? arr : []).map(fn);
const safeFilter = (arr, fn) => (Array.isArray(arr) ? arr : []).filter(fn);
const safeLength = (arr) => (Array.isArray(arr) ? arr.length : 0);

// Safe division
const total = count / (divisor || 1);

// Safe date formatting
const formatSafe = (dateStr) => {
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? 'Invalid date' : d.toLocaleDateString();
  } catch { return 'Invalid date'; }
};

// Safe JSON parsing
const parseJSON = (str, fallback = {}) => {
  try { return JSON.parse(str) || fallback; }
  catch { return fallback; }
};

// Safe number conversion
const toNumber = (val, fallback = 0) => {
  const n = Number(val);
  return isNaN(n) ? fallback : n;
};

CORRECT PATTERNS:
// Load data - empty deps, runs once
useEffect(() => {
  const load = async () => { /* load from storage */ };
  load();
}, []); // ✓ EMPTY ARRAY

// Timer - only boolean dep
useEffect(() => {
  if (isRunning) intervalRef.current = setInterval(...);
  return () => clearInterval(intervalRef.current);
}, [isRunning]); // ✓ ONLY THE CONTROL BOOLEAN

// Safe state update after async
const isMounted = useRef(true);
useEffect(() => {
  isMounted.current = true;
  const load = async () => {
    const data = await fetchData();
    if (isMounted.current) setData(data); // Only update if still mounted
  };
  load();
  return () => { isMounted.current = false; };
}, []);

// Save data - NO useEffect, call directly
const addItem = () => {
  const newItems = [...items, newItem];
  setItems(newItems);
  saveToStorage(newItems); // ✓ CALL DIRECTLY
};

WRONG PATTERNS (CAUSE INFINITE LOOPS OR CRASHES):
useEffect(() => { saveData(items); }, [items]); // ✗ INFINITE LOOP
useEffect(() => { setX(compute(y)); }, [y, x]); // ✗ INFINITE LOOP
useEffect(() => { setState(props.value); }); // ✗ NO DEPS = EVERY RENDER
items.map(x => x.name); // ✗ Crashes if items is undefined
data.length; // ✗ Crashes if data is undefined
value / divisor; // ✗ Crashes if divisor is 0
JSON.parse(str); // ✗ Crashes if str is invalid JSON

AVAILABLE COMPONENTS & APIS (all pre-injected):
- React: useState, useEffect, useCallback, useRef, useMemo
- UI Core: View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList, Modal, Switch, SafeAreaView, KeyboardAvoidingView, Pressable, Image, ActivityIndicator, Animated, Easing, Button
- UI Custom: Slider, ProgressBar, Badge, Card, StatCard, Divider, Spacer, Picker (pre-built components)
- Feedback: Alert, Share, Dimensions, Platform, Vibration
- Haptics: hapticFeedback.light(), hapticFeedback.medium(), hapticFeedback.heavy(), hapticFeedback.success(), hapticFeedback.warning(), hapticFeedback.error(), hapticFeedback.selection(), vibrate()
- Storage: AsyncStorage.getItem(key), AsyncStorage.setItem(key, value)
- Notifications: Notifications.scheduleNotificationAsync({ content, trigger })
- Clipboard: clipboard.copy(text), clipboard.paste()
- URLs: openURL(url) - open external links
- Charts: LineChart, BarChart, PieChart (from react-native-chart-kit)
- Icons: 180+ Lucide icons (Plus, Minus, Trash2, Check, Clock, Bell, Calendar, Target, Award, Heart, Star, TrendingUp, Settings, User, Home, Play, Pause, Timer, PlayCircle, PauseCircle, StopCircle, CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, etc.)
- Firebase: database, ref, set, push, onValue, get, remove, update
- Theme: colors.primary (#26A69A teal), colors.background (#F5F5F5 light gray), colors.card (#FFFFFF white), colors.text (#333333 charcoal), colors.textSecondary (#666666), colors.border (#E5E5E5), colors.success (#4CAF50), colors.error (#EF5350), colors.warning (#FF9800), colors.accent (#26A69A), colors.secondary (#FFCA28 yellow), colors.inputBackground (#FFFFFF), colors.inputBorder (#D0D0D0), colors.inputText (#333333)
- Helpers: safeArray(), safeLength(), safeMap(), safeFilter(), safeJSONParse(), safeJSONStringify(), safeNumber(), safeString(), safeObject()
- Math: clamp(value, min, max), lerp(start, end, t), randomInt(min, max), randomFloat(min, max), roundTo(value, decimals)
- Date/Time: formatDate(date), formatTime(date), formatDateTime(date), formatDuration(seconds)
- Navigation: goHome(), exitOracle() - call these to exit the mini-app and return to the main app home screen

IMPORTANT: There is a floating X button at the top-right that users can always use to exit. You do NOT need to add your own exit button unless the app has multiple internal views where an explicit "Exit" or "Done" button would improve UX.

TEXT INPUT STYLING (Light theme):
Style TextInput consistently with the light theme.
<TextInput
  style={{
    backgroundColor: colors.inputBackground,  // #FFFFFF white
    color: colors.inputText,                  // #333333 charcoal text
    borderColor: colors.inputBorder,          // #D0D0D0
    borderWidth: 1,
    borderRadius: 12,                         // Rounded corners
    padding: 12,
    fontSize: 16,
  }}
  placeholderTextColor={colors.textMuted}     // #999999
/>

CUSTOM COMPONENTS USAGE:
// Slider for numeric input
<Slider 
  value={sliderValue} 
  minimumValue={0} 
  maximumValue={100} 
  onValueChange={setSliderValue}
  step={1}
/>

// ProgressBar for goals
<ProgressBar progress={0.75} color={colors.primary} />

// Badge for status labels
<Badge color={colors.success}>Active</Badge>

// Card for content sections
<Card onPress={handlePress}>
  <Text>Card content</Text>
</Card>

// Picker for dropdown selection
<Picker selectedValue={period} onValueChange={setPeriod}>
  <Picker.Item label="1st Period" value="1st" />
  <Picker.Item label="2nd Period" value="2nd" />
  <Picker.Item label="3rd Period" value="3rd" />
</Picker>

// Haptic feedback on button press
<TouchableOpacity onPress={() => { hapticFeedback.medium(); doAction(); }}>
  <Text>Press Me</Text>
</TouchableOpacity>

FULL-FEATURED APP PATTERNS:

1. DATA PERSISTENCE (Required for any tracker):
useEffect(() => {
  const loadData = async () => {
    try {
      const stored = await AsyncStorage.getItem('@appname_data');
      if (stored) setData(JSON.parse(stored));
    } catch (e) { console.warn('Load failed', e); }
  };
  loadData();
}, []);

const saveData = async (newData) => {
  setData(newData);
  await AsyncStorage.setItem('@appname_data', JSON.stringify(newData));
};

2. MULTI-VIEW NAVIGATION:
const [view, setView] = useState('main');
const NavBar = () => (
  <View style={styles.navbar}>
    <TouchableOpacity onPress={() => setView('main')} style={[styles.navItem, view === 'main' && styles.navActive]}>
      <Home size={24} color={view === 'main' ? colors.primary : colors.textSecondary} />
      <Text style={styles.navText}>Home</Text>
    </TouchableOpacity>
    {/* More nav items */}
  </View>
);

3. TIMER/STOPWATCH:
const [isRunning, setIsRunning] = useState(false);
const [elapsed, setElapsed] = useState(0);
const intervalRef = useRef(null);

useEffect(() => {
  if (isRunning) {
    intervalRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
  } else {
    clearInterval(intervalRef.current);
  }
  return () => clearInterval(intervalRef.current);
}, [isRunning]);

const formatTime = (secs) => {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return \`\${m.toString().padStart(2, '0')}:\${s.toString().padStart(2, '0')}\`;
};

4. CHARTS & ANALYTICS:
<LineChart
  data={{
    labels: last7Days.map(d => d.label),
    datasets: [{ data: last7Days.map(d => d.value) }]
  }}
  width={Dimensions.get('window').width - 32}
  height={220}
  chartConfig={{
    backgroundColor: colors.card,
    backgroundGradientFrom: colors.card,
    backgroundGradientTo: colors.card,
    decimalPlaces: 0,
    color: (opacity = 1) => \`rgba(99, 102, 241, \${opacity})\`,
    labelColor: () => colors.textSecondary,
  }}
  bezier
  style={{ borderRadius: 16 }}
/>

5. PROFESSIONAL UI ELEMENTS:
// Stat Card
const StatCard = ({ icon: Icon, label, value, color }) => (
  <View style={styles.statCard}>
    <Icon size={24} color={color || colors.primary} />
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// Action Button
const ActionButton = ({ onPress, icon: Icon, label, variant = 'primary' }) => (
  <TouchableOpacity 
    style={[styles.actionBtn, variant === 'secondary' && styles.actionBtnSecondary]} 
    onPress={onPress}
  >
    <Icon size={20} color={variant === 'primary' ? '#fff' : colors.primary} />
    <Text style={[styles.actionBtnText, variant === 'secondary' && styles.actionBtnTextSecondary]}>{label}</Text>
  </TouchableOpacity>
);

EXPECTED OUTPUT LENGTH: 300-600 lines for a complete, polished app.

WHAT MAKES A GREAT ORACLE:
✓ Solves a real daily problem completely
✓ Has smooth animations and visual feedback
✓ Persists data across sessions
✓ Has multiple views (main, history, settings, stats)
✓ Includes summary statistics and insights
✓ Professional, polished UI with proper spacing
✓ Handles edge cases gracefully
✓ Delete/edit/undo capabilities
✓ Visual progress indicators

GENERATE COMPLETE, PRODUCTION-READY CODE.`;

// Use XMLHttpRequest as fallback - sometimes works better in React Native
function xhrRequest(url: string, options: { method: string; headers: Record<string, string>; body: string; timeout: number }): Promise<{ ok: boolean; status: number; json: () => Promise<any>; text: () => Promise<string> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method, url, true);
    xhr.timeout = options.timeout;
    
    // Set headers
    Object.entries(options.headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });
    
    xhr.onload = function() {
      const responseText = xhr.responseText;
      resolve({
        ok: xhr.status >= 200 && xhr.status < 300,
        status: xhr.status,
        json: () => Promise.resolve(JSON.parse(responseText)),
        text: () => Promise.resolve(responseText),
      });
    };
    
    xhr.onerror = function() {
      console.error('[XHR] Network error occurred');
      reject(new Error('Network request failed (XHR)'));
    };
    
    xhr.ontimeout = function() {
      console.error('[XHR] Request timed out');
      reject(new Error('Request timed out'));
    };
    
    xhr.send(options.body);
  });
}

async function callGrokAPI(userPrompt: string): Promise<string> {
  if (!XAI_API_KEY && !CLAUDE_API_KEY) {
    throw new Error('No API key found. Check your .env file.');
  }

  console.log('[OracleCodeGenerator] Generating code for:', userPrompt);

  const useXAI = !!XAI_API_KEY;

  if (useXAI) {
    const requestBody = JSON.stringify({
      model: 'grok-3',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    });
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${XAI_API_KEY}`,
    };
    
    // Try fetch first, fall back to XHR if it fails
    let response;
    try {
      console.log('[OracleCodeGenerator] Trying fetch API...');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);
      
      response = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: requestBody,
      });
      
      clearTimeout(timeoutId);
      console.log('[OracleCodeGenerator] Fetch succeeded');
    } catch (fetchError: any) {
      console.warn('[OracleCodeGenerator] Fetch failed, trying XMLHttpRequest...', fetchError.message);
      
      // Try XMLHttpRequest as fallback
      try {
        response = await xhrRequest('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers,
          body: requestBody,
          timeout: 120000,
        });
        console.log('[OracleCodeGenerator] XHR succeeded');
      } catch (xhrError: any) {
        console.error('[OracleCodeGenerator] Both fetch and XHR failed');
        throw new Error('Network error - unable to connect to AI service. This may be a limitation of Expo Go. Try testing on web (press w) or create a development build.');
      }
    }
    
    // Process the response (from either fetch or XHR)
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[OracleCodeGenerator] xAI API error:', errorText);
      throw new Error(`xAI API error: ${response.status}`);
    }

    const data = await response.json();
    const code = data.choices?.[0]?.message?.content || '';
    console.log('[OracleCodeGenerator] Generated code length:', code.length);
    
    // Validate response is not truncated
    if (code.length < 500) {
      throw new Error(`API returned truncated response (${code.length} chars)`);
    }
    if (!code.includes('export default') && !code.includes('function') && !code.includes('const')) {
      throw new Error('API response appears incomplete - no function or export found');
    }
    
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
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
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
    
    // Validate response is not truncated
    if (code.length < 500) {
      throw new Error(`API returned truncated response (${code.length} chars)`);
    }
    if (!code.includes('export default') && !code.includes('function') && !code.includes('const')) {
      throw new Error('API response appears incomplete - no function or export found');
    }
    
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
const REFINE_PROMPT_SYSTEM = `You are an expert app design consultant who transforms basic user ideas into comprehensive, feature-rich application specifications.

YOUR ROLE:
Take a simple concept and expand it into a detailed prompt that will guide AI code generation. Think about:
- All the UI components needed
- User interactions and workflows
- Data that needs to be tracked and displayed
- Visual elements that enhance the experience
- Edge cases and user convenience features

EXPANSION PRINCIPLES:
1. UNDERSTAND THE CORE - What is the user really trying to accomplish?
2. ADD USEFUL FEATURES - What related features would make this more useful?
3. DESIGN THE UI - What buttons, displays, sections would be needed?
4. CONSIDER DATA - What needs to be saved, calculated, or displayed?
5. ENHANCE UX - What would make this delightful to use?

EXAMPLES:

User: "Water tracker"
Refined: "A water intake tracking app with: preset quick-add buttons for common amounts (250ml, 500ml, 750ml), a large circular progress indicator showing daily goal completion with percentage, a scrollable history list showing today's logged entries with timestamps and amounts, daily goal setting with visual feedback when goal is reached, running total prominently displayed, and a weekly summary view showing the last 7 days of intake as a simple bar chart."

User: "Hockey shift tracker"  
Refined: "A hockey shift duration tracker with: large prominent START/STOP timer button with visual running state indicator, automatic shift duration calculation displayed in mm:ss format, period selector (1st, 2nd, 3rd, OT) to organize shifts by game period, scrollable list showing all recorded shifts grouped by period with individual durations, total ice time per period and overall game totals, ability to delete individual shifts if recorded in error, average shift length calculation, and an end game summary view showing complete game statistics."

User: "Todo list"
Refined: "A task management app with: text input field to add new tasks, swipeable task cards with delete action, tap to mark complete with strikethrough animation, task count showing completed vs total (e.g. 3/10 done), filter buttons to show all/active/completed tasks, clear completed button to bulk remove done items, tasks persist locally so they survive app restart, and optional due date with color-coded urgency indicators."

OUTPUT RULES:
- Return ONLY the refined prompt text (no explanations or commentary)
- Be specific about UI elements, buttons, and visual components
- Include data management requirements (what to track, save, display)
- Mention user interactions (tap, swipe, long-press where appropriate)
- Keep it to one detailed paragraph (3-6 sentences)
- Make it actionable for an AI code generator`;

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

/**
 * Main oracle generation function - ALWAYS uses AI for custom generation
 * NO TEMPLATE FALLBACKS - users get exactly what they ask for
 * @param userPrompt The user's description of what they want
 */
export async function generateOracleCode(userPrompt: string): Promise<string> {
  console.log('[OracleCodeGenerator] ===== FUNCTION STARTED =====');
  console.log('[OracleCodeGenerator] Input prompt length:', userPrompt.length);
  console.log('[OracleCodeGenerator] AI-ONLY MODE - No template fallbacks');
  
  const MAX_RETRIES = 3;
  const QUALITY_THRESHOLD = 40;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`[OracleCodeGenerator] Attempt ${attempt}/${MAX_RETRIES}...`);
      
      // ALWAYS use AI - no templates, no fallbacks
      console.log('[OracleCodeGenerator] Calling AI API...');
      const rawCode = await callGrokAPI(userPrompt);
      
      // CRITICAL DEBUG: Log rawCode immediately after API call
      console.log('[OracleCodeGenerator] DEBUG rawCode received, length:', rawCode.length);
      console.log('[OracleCodeGenerator] DEBUG rawCode first 100 chars:', rawCode.substring(0, 100));
      console.log('[OracleCodeGenerator] DEBUG rawCode has export default:', rawCode.includes('export default'));
      
      let processedCode = cleanGeneratedCode(rawCode);
      
      // CRITICAL DEBUG: Log after cleaning
      console.log('[OracleCodeGenerator] DEBUG after cleanGeneratedCode, length:', processedCode.length);

      if (!processedCode || processedCode.length < 100) {
        throw new Error('Generated code is too short or empty');
      }

      if (!processedCode.includes('export default')) {
        throw new Error('Generated code missing default export');
      }

      // Step 3: Self-correction engine (automatic error fixing)
      console.log('[OracleCodeGenerator] Running self-correction engine...');
      const correctionResult = SelfCorrectionEngine.correct(processedCode);
      
      if (correctionResult.corrections.length > 0) {
        console.log(`[OracleCodeGenerator] Applied ${correctionResult.corrections.length} auto-corrections`);
        processedCode = correctionResult.corrected;
        console.log('[OracleCodeGenerator] DEBUG after self-correction, length:', processedCode.length);
        
        // Log correction types
        const correctionTypes = [...new Set(correctionResult.corrections.map(c => c.type))];
        console.log('[OracleCodeGenerator] Correction types:', correctionTypes.join(', '));
      }

      // Step 4: Formal verification with auto-fix
      console.log('[OracleCodeGenerator] Running formal verification...');
      const verification = FormalVerifier.verify(processedCode);
      
      if (!verification.isValid) {
        console.log('[OracleCodeGenerator] Issues found, applying auto-fix...');
        const fixed = FormalVerifier.autoFix(processedCode);
        processedCode = fixed.code;
        console.log('[OracleCodeGenerator] DEBUG after formal verification fix, length:', processedCode.length);
        console.log('[OracleCodeGenerator] Applied fixes:', fixed.fixesApplied.join(', '));
      }

      // Step 5: Compatibility check
      console.log('[OracleCodeGenerator] Checking compatibility...');
      const compatibility = CompatibilityChecker.check(processedCode);
      
      if (!compatibility.isCompatible) {
        console.log('[OracleCodeGenerator] Compatibility issues found, fixing...');
        const fixed = CompatibilityChecker.autoFix(processedCode);
        processedCode = fixed.code;
        console.log('[OracleCodeGenerator] DEBUG after compatibility fix, length:', processedCode.length);
        console.log('[OracleCodeGenerator] Compatibility fixes:', fixed.fixes.join(', '));
      }

      // Step 6: Edge case handling injection
      const isComplexApp = /useState.*\[\]|fetch\(|AsyncStorage|setInterval|addEventListener/i.test(processedCode);
      if (isComplexApp) {
        console.log('[OracleCodeGenerator] Injecting edge case handling...');
        const edgeCased = EdgeCaseHandler.injectEdgeCaseHandling(processedCode, {
          networkFailures: /fetch\(/i.test(processedCode),
          memoryPressure: true,
          inputValidation: /TextInput/i.test(processedCode),
          boundaryConditions: true,
          deviceRotation: false,
          offlineMode: false,
        });
        
        if (edgeCased.injected.length > 0 && edgeCased.code.includes('export default')) {
          processedCode = edgeCased.code;
          console.log('[OracleCodeGenerator] DEBUG after edge case handling, length:', processedCode.length);
          console.log('[OracleCodeGenerator] Edge cases injected:', edgeCased.injected.join(', '));
        }
      }

      // Step 7: Sandboxed runtime validation (device/scenario simulation)
      console.log('[OracleCodeGenerator] Running sandboxed validation...');
      const sandboxResult = await SandboxedRuntime.execute(processedCode, 'GeneratedOracle');
      
      if (!sandboxResult.success) {
        const criticalErrors = sandboxResult.errors.filter(e => 
          e.severity === 'critical' || e.severity === 'high'
        );
        
        if (criticalErrors.length > 0) {
          console.log('[OracleCodeGenerator] Sandbox found critical issues, applying corrections...');
          
          // Apply sandbox-suggested corrections
          if (sandboxResult.selfCorrectionApplied && sandboxResult.correctedCode) {
            processedCode = sandboxResult.correctedCode;
            console.log('[OracleCodeGenerator] DEBUG after sandbox correction, length:', processedCode.length);
          }
        }
        
        // Log warnings
        sandboxResult.warnings.forEach(w => {
          console.warn(`[OracleCodeGenerator] Sandbox warning: ${w.message}`);
        });
      }
      
      console.log(`[OracleCodeGenerator] Sandbox coverage: ${sandboxResult.coverageReport.coveragePercentage}%`);
      console.log(`[OracleCodeGenerator] Devices tested: ${sandboxResult.deviceResults.length}, Scenarios: ${sandboxResult.inputResults.length}`);

      // Step 8: Predictive simulation (digital twin)
      console.log('[OracleCodeGenerator] Running predictive simulation...');
      const simulation = PredictiveSimulator.simulate(processedCode);
      
      // Check predictions for critical issues
      const criticalPredictions = simulation.predictions.filter(p => 
        p.impact === 'critical' && p.likelihood > 0.5
      );
      
      if (criticalPredictions.length > 0) {
        console.warn('[OracleCodeGenerator] Critical predictions detected:');
        criticalPredictions.forEach(p => {
          console.warn(`  - ${p.description} (${Math.round(p.likelihood * 100)}% likely)`);
        });
        
        // Apply recommended fixes if possible
        for (const rec of simulation.recommendations.filter(r => r.automated)) {
          console.log(`[OracleCodeGenerator] Applying automated fix: ${rec.description}`);
          // Self-correction engine will handle the fix
          const fixResult = SelfCorrectionEngine.correct(processedCode);
          if (fixResult.corrections.length > 0) {
            processedCode = fixResult.corrected;
            console.log('[OracleCodeGenerator] DEBUG after prediction fix, length:', processedCode.length);
          }
        }
      }

      // Step 9: Final verification
      const finalVerification = FormalVerifier.verify(processedCode);
      console.log('[OracleCodeGenerator] Final quality score:', finalVerification.score);

      // Step 10: Generate test suite metadata
      const testSuite = TestGenerator.generateTestSuite(processedCode);
      console.log(`[OracleCodeGenerator] Test coverage: ${testSuite.coverageReport.statements}% statements, ${testSuite.coverageReport.branches}% branches`);

      // Check quality threshold
      if (finalVerification.score < QUALITY_THRESHOLD) {
        console.warn(`[OracleCodeGenerator] Quality score ${finalVerification.score} below threshold ${QUALITY_THRESHOLD}`);
        if (attempt < MAX_RETRIES) {
          throw new Error(`Quality score too low: ${finalVerification.score}`);
        }
      }

      // Final anomaly check
      const anomalies = SelfCorrectionEngine.detectAnomalies(processedCode);
      if (anomalies.riskLevel === 'critical') {
        console.error('[OracleCodeGenerator] Critical anomalies detected:', anomalies.anomalies.map(a => a.description));
        if (attempt < MAX_RETRIES) {
          throw new Error('Critical anomalies detected');
        }
      }

      console.log('[OracleCodeGenerator] ✓ Valid code generated (quality:', finalVerification.score + ')');
      console.log('[OracleCodeGenerator] ✓ Simulation state coverage:', Math.round(simulation.coverage.stateCoverage * 100) + '%');
      
      // CRITICAL: Final validation before return
      console.log('[OracleCodeGenerator] Final processedCode length:', processedCode.length);
      
      if (!processedCode || processedCode.length < 500) {
        console.error('[OracleCodeGenerator] CRITICAL: Code was truncated! Length:', processedCode?.length);
        console.error('[OracleCodeGenerator] Code preview:', processedCode?.substring(0, 300));
        throw new Error(`Code was truncated during processing (${processedCode?.length || 0} chars)`);
      }
      
      if (!processedCode.includes('export default')) {
        console.error('[OracleCodeGenerator] CRITICAL: Code missing export default');
        throw new Error('Processed code missing export default');
      }
      
      // Check for truncation signatures
      if (processedCode.includes('useSta.') || processedCode.includes('useState.') || processedCode.includes('useEff.')) {
        console.error('[OracleCodeGenerator] CRITICAL: Code appears truncated mid-word');
        throw new Error('Code was truncated mid-statement');
      }
      
      console.log('[OracleCodeGenerator] Returning code, final length:', processedCode.length);
      return processedCode;
    } catch (error: any) {
      console.error(`[OracleCodeGenerator] Attempt ${attempt} failed:`, error.message);

      if (attempt === MAX_RETRIES) {
        throw new Error('Failed to generate oracle code. Please try rephrasing your request.');
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, attempt * 1500));
    }
  }

  throw new Error('Failed to generate oracle code after all retries');
}
