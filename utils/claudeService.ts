interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ClaudeResponse {
  id: string;
  content: { type: string; text: string }[];
  model: string;
  stop_reason: string;
}

interface GenerateOracleResult {
  name: string;
  description: string;
  code: string;
  accentColor: string;
  icon: string;
}

const SYSTEM_PROMPT = `You are an expert React Native developer that creates fully functional mini-apps called "oracles". You generate complete, working React Native components from natural language descriptions.

CRITICAL: Return ONLY a valid JSON object. No markdown, no code blocks, no explanation text before or after.

OUTPUT FORMAT:
{
  "name": "Short Name",
  "description": "Brief description",
  "code": "COMPONENT_CODE_AS_SINGLE_LINE_STRING",
  "accentColor": "#HEX",
  "icon": "emoji"
}

CODE REQUIREMENTS:
1. Function must be named exactly: function OracleComponent({ data, onDataChange, onAddLog, logs, accent })
2. NO import statements - all dependencies are pre-provided as globals
3. NO export statements
4. Must end with: const styles = StyleSheet.create({ ... });
5. Code must be a single-line string with \\n for newlines and \\" for quotes inside strings

AVAILABLE GLOBALS (use directly, do NOT import):
- React Hooks: useState, useEffect, useCallback, useMemo, useRef
- RN Components: View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, FlatList, Switch, Modal, Animated
- RN APIs: Alert, Share, Platform, Dimensions
- Icons: Check, Plus, Minus, Trash2, RefreshCw, Share2, Droplet, Flame, TrendingUp, TrendingDown, Clock, Zap, Heart, Star, Calendar, Target, Award, Bell, Activity, ShoppingCart, DollarSign, BarChart3, Coffee, Moon, Sun, Edit2, Save, X, ChevronRight, ChevronDown, Search, Filter, Settings, User, Home, MapPin, Phone, Mail, Camera, Play, Pause, ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Eye, EyeOff, Copy, Download, Upload, Bookmark, Tag, CreditCard, Wallet, Calculator, Percent, Timer, Alarm, Watch, Cloud, Thermometer, Briefcase, Building, Car, Flag, Map, Globe, Mountain, Apple, Pizza, Utensils, Pill, Dumbbell, Trophy, Medal, Crown, Gem, Sparkles, Lightbulb, Rocket, Music, Headphones, Mic, Video, Tv, Smartphone, Laptop, Database, Code, Terminal, Bug, Shield, Key
- Charts: BarChart, LineChart, PieChart (use with chartConfig global)
- Constants: screenWidth, colors, chartConfig

COLORS OBJECT:
const colors = {
  background: '#0A0A0A',
  surface: '#1A1A1A',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textMuted: '#888888',
  surfaceBorder: '#1F1F1F',
  accent: '#0AFFE6',
  success: '#00FF88',
  error: '#FF3B5C',
  warning: '#FFB800',
  inputBackground: '#0F0F0F',
  inputBorder: '#2A2A2A',
};

COMPONENT PROPS:
- data: object - Persistent storage (use for lists, settings, saved state)
- onDataChange: (newData) => void - Save data (merges with existing)
- onAddLog: ({ type, value, metadata? }) => void - Log time-series events
- logs: array - Historical logs with { id, timestamp, date, type, value, metadata }
- accent: string - Theme accent color

DATA PATTERNS:
- Lists/Settings: Store in data via onDataChange({ items: [...] })
- Trackers/History: Use onAddLog for daily entries, read from logs array

SIMPLE WORKING EXAMPLE:
function OracleComponent({ data, onDataChange, onAddLog, logs, accent }) {
  const items = data.items || [];
  const [newItem, setNewItem] = useState('');

  const addItem = useCallback(() => {
    if (!newItem.trim()) return;
    onDataChange({ items: [...items, { id: Date.now().toString(), text: newItem.trim(), done: false }] });
    setNewItem('');
  }, [newItem, items, onDataChange]);

  const toggleItem = useCallback((id) => {
    onDataChange({ items: items.map(i => i.id === id ? { ...i, done: !i.done } : i) });
  }, [items, onDataChange]);

  const deleteItem = useCallback((id) => {
    onDataChange({ items: items.filter(i => i.id !== id) });
  }, [items, onDataChange]);

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>My List</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Add item..."
          placeholderTextColor={colors.textMuted}
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={addItem}
        />
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: accent }]} onPress={addItem}>
          <Plus size={20} color={colors.background} />
        </TouchableOpacity>
      </View>
      {items.map(item => (
        <View key={item.id} style={styles.item}>
          <TouchableOpacity onPress={() => toggleItem(item.id)} style={[styles.checkbox, item.done && { backgroundColor: accent }]}>
            {item.done && <Check size={14} color={colors.background} />}
          </TouchableOpacity>
          <Text style={[styles.itemText, item.done && styles.itemDone]}>{item.text}</Text>
          <TouchableOpacity onPress={() => deleteItem(item.id)}>
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: colors.background },
  title: { fontSize: 24, fontWeight: '600', color: colors.text, marginBottom: 20 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: { flex: 1, backgroundColor: colors.inputBackground, borderWidth: 1, borderColor: colors.inputBorder, borderRadius: 8, padding: 12, color: colors.text },
  addBtn: { width: 48, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceBorder, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.surfaceBorder, justifyContent: 'center', alignItems: 'center' },
  itemText: { flex: 1, fontSize: 15, color: colors.text },
  itemDone: { textDecorationLine: 'line-through', color: colors.textMuted },
});

KEY REQUIREMENTS:
1. Make it FULLY FUNCTIONAL - users can use immediately
2. Include CRUD operations where applicable
3. Add SEARCH for lists with many items
4. Show PROGRESS/STATISTICS where relevant
5. Handle EMPTY STATES gracefully
6. Use accent color for interactive elements
7. Dark theme with proper contrast

TRACKER PATTERN (water, habits, mood):
- Use onAddLog({ type: 'intake', value: amount }) for daily entries
- Calculate streaks from consecutive days in logs
- Show weekly charts using BarChart with chartConfig

LIST PATTERN (shopping, todo, notes):
- Store items in data.items via onDataChange
- Include add/edit/delete/toggle
- Add search/filter for longer lists

CALCULATOR/TOOL PATTERN:
- Immediate calculations with clear results
- Input validation
- Optional history via onAddLog

FOR EDITS:
When editing existing code, keep ALL functionality intact and only modify what was specifically requested.

REMEMBER: Return ONLY the JSON object. The code field must be a properly escaped string.`;

export async function generateOracleWithClaude(
  userPrompt: string,
  conversationHistory: ClaudeMessage[] = [],
  lastOracleCode?: string
): Promise<GenerateOracleResult> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error('Anthropic API key not configured');
  }

  let enhancedPrompt = userPrompt;
  
  if (lastOracleCode && conversationHistory.length > 0) {
    const isEdit = /change|make|add|edit|update|modify|improve|different|better|remove|delete|fix|adjust|tweak|enhance|include|with|want|need|can you|please/i.test(userPrompt);
    if (isEdit) {
      enhancedPrompt = `EDIT REQUEST: Modify the existing oracle based on user feedback.

USER REQUEST: "${userPrompt}"

CURRENT CODE TO MODIFY:
\`\`\`
${lastOracleCode}
\`\`\`

Apply ONLY the requested changes. Keep all other functionality intact. Return the complete modified code.`;
    }
  }

  const messages: ClaudeMessage[] = [
    ...conversationHistory,
    {
      role: 'user',
      content: enhancedPrompt,
    },
  ];

  console.log('[Claude] Sending request with', messages.length, 'messages');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16384,
      system: SYSTEM_PROMPT,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[Claude] API error:', response.status, errorText);
    throw new Error(`Claude API error: ${response.status}`);
  }

  const data = (await response.json()) as ClaudeResponse;
  console.log('[Claude] Response received, stop_reason:', data.stop_reason);

  const textContent = data.content.find(c => c.type === 'text')?.text || '';
  
  console.log('[Claude] Raw response length:', textContent.length);

  const result = parseClaudeResponse(textContent);
  
  result.code = sanitizeGeneratedCode(result.code);

  console.log('[Claude] Successfully parsed oracle:', result.name);
  console.log('[Claude] Code length:', result.code.length);
  
  return result;
}

function parseClaudeResponse(text: string): GenerateOracleResult {
  let cleanText = text.trim();
  
  cleanText = cleanText.replace(/```json\s*/gi, '');
  cleanText = cleanText.replace(/```javascript\s*/gi, '');
  cleanText = cleanText.replace(/```jsx\s*/gi, '');
  cleanText = cleanText.replace(/```\s*/gi, '');
  
  const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('[Claude] No JSON found in response');
    console.error('[Claude] Response preview:', cleanText.substring(0, 500));
    throw new Error('Failed to parse response - no JSON object found');
  }

  let jsonText = jsonMatch[0];
  
  try {
    const result = JSON.parse(jsonText) as GenerateOracleResult;
    
    if (!result.code || !result.name) {
      throw new Error('Missing required fields (name or code)');
    }
    
    return result;
  } catch (parseError) {
    console.log('[Claude] Initial parse failed, attempting recovery...');
    console.log('[Claude] Parse error:', parseError);
    
    const recovered = recoverTruncatedJson(jsonText);
    if (recovered) {
      return recovered;
    }
    
    throw new Error('Failed to parse Claude response. Try a simpler request.');
  }
}

function recoverTruncatedJson(jsonText: string): GenerateOracleResult | null {
  try {
    const nameMatch = jsonText.match(/"name"\s*:\s*"([^"]+)"/);
    const descMatch = jsonText.match(/"description"\s*:\s*"([^"]+)"/);
    const accentMatch = jsonText.match(/"accentColor"\s*:\s*"([^"]+)"/);
    const iconMatch = jsonText.match(/"icon"\s*:\s*"([^"]+)"/);
    
    if (!nameMatch) {
      console.log('[Recovery] Cannot recover - missing name');
      return null;
    }
    
    let codeValue = '';
    const codeStartMatch = jsonText.match(/"code"\s*:\s*"/);
    if (codeStartMatch) {
      const codeStart = jsonText.indexOf(codeStartMatch[0]) + codeStartMatch[0].length;
      let codeEnd = codeStart;
      
      for (let i = codeStart; i < jsonText.length; i++) {
        const char = jsonText[i];
        const prevChar = i > 0 ? jsonText[i - 1] : '';
        
        if (char === '"' && prevChar !== '\\') {
          const nextChars = jsonText.substring(i + 1, i + 10).trim();
          if (nextChars.startsWith(',') || nextChars.startsWith('}') || nextChars === '') {
            codeEnd = i;
            break;
          }
        }
      }
      
      if (codeEnd > codeStart) {
        codeValue = jsonText.substring(codeStart, codeEnd);
      } else {
        const roughMatch = jsonText.match(/"code"\s*:\s*"([\s\S]*?)(?:"\s*,\s*"accentColor|"\s*,\s*"icon|"\s*})/);
        if (roughMatch) {
          codeValue = roughMatch[1];
        }
      }
      
      codeValue = codeValue
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
      
      if (!codeValue.includes('StyleSheet.create')) {
        codeValue += `\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, padding: 20, backgroundColor: colors.background },\n});`;
      }
    }
    
    if (!codeValue || codeValue.length < 100) {
      console.log('[Recovery] Code too short or missing');
      return null;
    }
    
    console.log('[Recovery] Successfully recovered truncated JSON');
    
    return {
      name: nameMatch[1],
      description: descMatch?.[1] || 'Custom oracle',
      code: codeValue,
      accentColor: accentMatch?.[1] || '#0AFFE6',
      icon: iconMatch?.[1] || '✨',
    };
  } catch (e) {
    console.error('[Recovery] Failed:', e);
    return null;
  }
}

export function sanitizeGeneratedCode(code: string): string {
  let sanitized = code;
  
  sanitized = sanitized.replace(/^\s*import\s+.*?[;\n]/gm, '');
  sanitized = sanitized.replace(/^\s*export\s+(default\s+)?/gm, '');
  sanitized = sanitized.replace(/```[a-z]*\s*/gi, '');
  
  sanitized = sanitized.replace(/\\n/g, '\n');
  sanitized = sanitized.replace(/\\t/g, '\t');
  sanitized = sanitized.replace(/\\"/g, '"');
  sanitized = sanitized.replace(/\\\\/g, '\\');
  
  sanitized = sanitized.trim();
  
  const hasOracleComponent = /function\s+OracleComponent\s*\(/.test(sanitized) || 
                             /const\s+OracleComponent\s*=/.test(sanitized);
  
  if (!hasOracleComponent) {
    console.warn('[Sanitize] Code missing OracleComponent, attempting to fix...');
    
    const arrowMatch = sanitized.match(/const\s+(\w+)\s*=\s*\(\s*\{\s*data/);
    if (arrowMatch && arrowMatch[1] !== 'OracleComponent') {
      console.log('[Sanitize] Found arrow function:', arrowMatch[1]);
      sanitized = sanitized.replace(
        new RegExp(`const\\s+${arrowMatch[1]}\\s*=`),
        'const OracleComponent ='
      );
    } else {
      const funcMatch = sanitized.match(/function\s+(\w+)\s*\(\s*\{\s*data/);
      if (funcMatch && funcMatch[1] !== 'OracleComponent') {
        console.log('[Sanitize] Found function:', funcMatch[1]);
        sanitized = sanitized.replace(
          new RegExp(`function\\s+${funcMatch[1]}\\s*\\(`),
          'function OracleComponent('
        );
      }
    }
  }
  
  console.log('[Sanitize] Final code length:', sanitized.length);
  console.log('[Sanitize] Has OracleComponent:', /OracleComponent/.test(sanitized));
  return sanitized;
}

export function buildConversationHistory(
  messages: { role: 'user' | 'assistant'; content: string }[]
): ClaudeMessage[] {
  return messages.map(m => ({
    role: m.role,
    content: m.content,
  }));
}

export async function streamingLikeGeneration(
  userPrompt: string,
  conversationHistory: ClaudeMessage[] = [],
  lastOracleCode?: string,
  onProgress?: (stage: string) => void
): Promise<GenerateOracleResult> {
  onProgress?.('Understanding your request...');
  await new Promise(resolve => setTimeout(resolve, 400));
  
  onProgress?.('Designing the interface...');
  await new Promise(resolve => setTimeout(resolve, 300));
  
  onProgress?.('Writing the code...');
  
  const result = await generateOracleWithClaude(userPrompt, conversationHistory, lastOracleCode);
  
  onProgress?.('Finalizing...');
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return result;
}
