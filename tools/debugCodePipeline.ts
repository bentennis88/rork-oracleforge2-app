/**
 * Debug Tool: Code Generation Pipeline Tracer
 * 
 * This tool traces the execution flow through the code generation pipeline
 * to identify where code truncation or corruption occurs.
 * 
 * ROOT CAUSE ANALYSIS:
 * ====================
 * The regression was caused by corrupted cache data. Here's the chain of events:
 * 
 * 1. INITIAL FAILURE (Previous Session):
 *    - API call returned truncated code (205 chars instead of ~14,000)
 *    - The truncated code looked like: "const [currentView, setCurrentView] = useStat."
 *    - Note: "useStat." is truncated "useState"
 * 
 * 2. CACHE STORAGE BUG:
 *    - ResponseCache.set() stored the truncated code WITHOUT validation
 *    - No check for minimum length
 *    - No check for valid structure (export default, complete statements)
 * 
 * 3. SUBSEQUENT FAILURE (Current Session):
 *    - User requested similar oracle
 *    - Cache hash matched the input
 *    - ResponseCache.get() returned the CORRUPTED cached data
 *    - Babel parser failed on incomplete code: "useStat."
 * 
 * AFFECTED FILES:
 * ===============
 * - services/sandbox/LocalModelFallback.ts (lines 1021-1076, 1230-1250)
 * - services/oracleCodeGenerator.ts (lines 388-397, 423-432)
 * 
 * MINIMAL REPRODUCIBLE EXAMPLE:
 * =============================
 */

// ============================================================================
// TYPES
// ============================================================================

interface TraceEntry {
  timestamp: number;
  stage: string;
  function: string;
  input?: any;
  output?: any;
  codeLength?: number;
  codePreview?: string;
  error?: string;
  isCorrupted?: boolean;
}

interface PipelineTrace {
  startTime: number;
  endTime?: number;
  success: boolean;
  entries: TraceEntry[];
  rootCause?: string;
  corruptionPoint?: string;
}

// ============================================================================
// CORRUPTION DETECTION
// ============================================================================

const TRUNCATION_SIGNATURES = [
  'useStat.',      // Truncated "useState"
  'useEff.',       // Truncated "useEffect"  
  'setS.',         // Truncated setState
  'AsyncSto.',     // Truncated "AsyncStorage"
  'StyleShe.',     // Truncated "StyleSheet"
  'TouchableO.',   // Truncated "TouchableOpacity"
];

function detectCorruption(code: string): { isCorrupted: boolean; reason: string } {
  if (!code) {
    return { isCorrupted: true, reason: 'Code is null or undefined' };
  }
  
  if (code.length < 500) {
    return { isCorrupted: true, reason: `Code too short: ${code.length} chars (min 500)` };
  }
  
  // Check for truncation signatures
  for (const sig of TRUNCATION_SIGNATURES) {
    if (code.includes(sig)) {
      return { isCorrupted: true, reason: `Truncation signature found: "${sig}"` };
    }
  }
  
  // Check for missing export default
  if (!code.includes('export default')) {
    return { isCorrupted: true, reason: 'Missing "export default"' };
  }
  
  // Check for unbalanced brackets
  const openBraces = (code.match(/{/g) || []).length;
  const closeBraces = (code.match(/}/g) || []).length;
  if (openBraces !== closeBraces) {
    return { isCorrupted: true, reason: `Unbalanced braces: ${openBraces} open, ${closeBraces} close` };
  }
  
  // Check if code ends mid-statement
  const trimmed = code.trim();
  if (trimmed.endsWith('.') || trimmed.endsWith('=') || trimmed.endsWith(',')) {
    return { isCorrupted: true, reason: `Code ends mid-statement: "${trimmed.slice(-20)}"` };
  }
  
  return { isCorrupted: false, reason: 'Code appears valid' };
}

// ============================================================================
// PIPELINE TRACER
// ============================================================================

class PipelineTracer {
  private trace: PipelineTrace;
  
  constructor() {
    this.trace = {
      startTime: Date.now(),
      success: false,
      entries: [],
    };
  }
  
  addEntry(stage: string, fn: string, data: Partial<TraceEntry>): void {
    const entry: TraceEntry = {
      timestamp: Date.now(),
      stage,
      function: fn,
      ...data,
    };
    
    // Auto-detect corruption if code is present
    if (data.output && typeof data.output === 'string') {
      const corruption = detectCorruption(data.output);
      entry.isCorrupted = corruption.isCorrupted;
      entry.codeLength = data.output.length;
      entry.codePreview = data.output.substring(0, 100) + '...';
      
      if (corruption.isCorrupted && !this.trace.corruptionPoint) {
        this.trace.corruptionPoint = `${stage}::${fn}`;
        this.trace.rootCause = corruption.reason;
      }
    }
    
    this.trace.entries.push(entry);
  }
  
  complete(success: boolean): PipelineTrace {
    this.trace.endTime = Date.now();
    this.trace.success = success;
    return this.trace;
  }
  
  getTrace(): PipelineTrace {
    return this.trace;
  }
  
  printTrace(): void {
    console.log('\n========== PIPELINE TRACE ==========\n');
    console.log(`Duration: ${(this.trace.endTime || Date.now()) - this.trace.startTime}ms`);
    console.log(`Success: ${this.trace.success}`);
    
    if (this.trace.corruptionPoint) {
      console.log(`\n🚨 CORRUPTION DETECTED!`);
      console.log(`   Point: ${this.trace.corruptionPoint}`);
      console.log(`   Cause: ${this.trace.rootCause}`);
    }
    
    console.log('\n--- Execution Flow ---\n');
    
    for (const entry of this.trace.entries) {
      const status = entry.isCorrupted ? '❌' : '✓';
      const time = entry.timestamp - this.trace.startTime;
      
      console.log(`[${time}ms] ${status} ${entry.stage}::${entry.function}`);
      
      if (entry.codeLength !== undefined) {
        console.log(`         Code length: ${entry.codeLength} chars`);
      }
      if (entry.codePreview) {
        console.log(`         Preview: ${entry.codePreview}`);
      }
      if (entry.error) {
        console.log(`         Error: ${entry.error}`);
      }
    }
    
    console.log('\n====================================\n');
  }
}

// ============================================================================
// MINIMAL REPRODUCIBLE EXAMPLE
// ============================================================================

/**
 * This simulates the exact failure scenario:
 * 
 * 1. Simulated API returns truncated code
 * 2. Cache stores it without validation
 * 3. Next request retrieves corrupted code
 * 4. Babel fails to parse
 */

interface SimulatedCache {
  data: Map<string, string>;
  set(key: string, value: string): void;
  get(key: string): string | null;
}

// BUG: Original cache had NO validation
function createBuggyCache(): SimulatedCache {
  const data = new Map<string, string>();
  return {
    data,
    set(key: string, value: string): void {
      // BUG: No validation - stores ANY code including truncated
      data.set(key, value);
    },
    get(key: string): string | null {
      return data.get(key) || null;
    }
  };
}

// FIX: New cache WITH validation
function createFixedCache(): SimulatedCache {
  const data = new Map<string, string>();
  return {
    data,
    set(key: string, value: string): void {
      // FIX: Validate before storing
      const corruption = detectCorruption(value);
      if (corruption.isCorrupted) {
        console.log('[FixedCache] Refusing to cache corrupted code:', corruption.reason);
        return;
      }
      console.log('[FixedCache] Caching valid code, length:', value.length);
      data.set(key, value);
    },
    get(key: string): string | null {
      const cached = data.get(key);
      if (cached) {
        // FIX: Validate on retrieval too
        const corruption = detectCorruption(cached);
        if (corruption.isCorrupted) {
          console.log('[FixedCache] Removing corrupted cache entry:', corruption.reason);
          data.delete(key);
          return null;
        }
      }
      return cached || null;
    }
  };
}

// Simulated API that sometimes returns truncated responses
function simulateTruncatedAPIResponse(): string {
  // This simulates what the Grok API returned - truncated code
  return `const SportsTimerApp = () => {
  const [currentView, setCurrentView] = useStat.
}`;
}

function simulateValidAPIResponse(): string {
  // This is what a valid response looks like
  return `const SportsTimerApp = () => {
  const [currentView, setCurrentView] = useState('main');
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  useEffect(() => {
    let interval;
    if (isRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);
  
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sports Timer</Text>
      <Text style={styles.time}>{elapsedTime}s</Text>
      <TouchableOpacity onPress={() => setIsRunning(!isRunning)}>
        <Text>{isRunning ? 'Stop' : 'Start'}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '600' },
  time: { fontSize: 48, marginVertical: 20 },
});

export default SportsTimerApp;`;
}

// ============================================================================
// RUN SIMULATION
// ============================================================================

export function runFailureSimulation(): void {
  console.log('\n🔬 RUNNING FAILURE SIMULATION\n');
  console.log('This demonstrates the exact bug that caused the regression.\n');
  
  const tracer = new PipelineTracer();
  const buggyCache = createBuggyCache();
  
  // Step 1: Simulate first request with truncated API response
  console.log('--- Step 1: First Request (API returns truncated) ---');
  tracer.addEntry('API', 'callGrokAPI', { input: 'hockey shift tracker' });
  
  const truncatedCode = simulateTruncatedAPIResponse();
  tracer.addEntry('API', 'response', { output: truncatedCode });
  
  // BUG: Cache stores truncated code without validation
  buggyCache.set('hockey_tracker_hash', truncatedCode);
  tracer.addEntry('Cache', 'set', { 
    input: 'hockey_tracker_hash',
    output: truncatedCode,
  });
  
  console.log('Cache now contains corrupted code!\n');
  
  // Step 2: Simulate second request - cache hit returns corrupted data
  console.log('--- Step 2: Second Request (Cache Hit) ---');
  tracer.addEntry('Cache', 'get', { input: 'hockey_tracker_hash' });
  
  const cachedCode = buggyCache.get('hockey_tracker_hash');
  tracer.addEntry('Cache', 'hit', { output: cachedCode });
  
  // Step 3: Try to parse - this fails
  console.log('--- Step 3: Babel Parse Attempt ---');
  tracer.addEntry('Babel', 'parse', { input: cachedCode });
  
  try {
    // Simulate Babel parse failure
    if (cachedCode && cachedCode.includes('useStat.')) {
      throw new Error(`Unexpected token (line 2:46) - incomplete identifier "useStat."`);
    }
  } catch (e: any) {
    tracer.addEntry('Babel', 'error', { error: e.message });
  }
  
  tracer.complete(false);
  tracer.printTrace();
}

export function runFixedSimulation(): void {
  console.log('\n✅ RUNNING FIXED SIMULATION\n');
  console.log('This demonstrates the fix - cache validates before storing.\n');
  
  const tracer = new PipelineTracer();
  const fixedCache = createFixedCache();
  
  // Step 1: Simulate first request with truncated API response
  console.log('--- Step 1: First Request (API returns truncated) ---');
  tracer.addEntry('API', 'callGrokAPI', { input: 'hockey shift tracker' });
  
  const truncatedCode = simulateTruncatedAPIResponse();
  tracer.addEntry('API', 'response', { output: truncatedCode });
  
  // FIX: Cache REJECTS truncated code
  fixedCache.set('hockey_tracker_hash', truncatedCode);
  tracer.addEntry('Cache', 'set_rejected', { 
    input: 'hockey_tracker_hash',
    output: truncatedCode,
    error: 'Validation failed - code not stored',
  });
  
  console.log('\n--- Step 2: Retry with valid response ---');
  
  const validCode = simulateValidAPIResponse();
  tracer.addEntry('API', 'response', { output: validCode });
  
  // FIX: Cache ACCEPTS valid code
  fixedCache.set('hockey_tracker_hash', validCode);
  tracer.addEntry('Cache', 'set_accepted', { 
    input: 'hockey_tracker_hash',
    output: validCode,
  });
  
  // Step 3: Next request - cache hit returns VALID data
  console.log('\n--- Step 3: Subsequent Request (Cache Hit) ---');
  
  const cachedCode = fixedCache.get('hockey_tracker_hash');
  tracer.addEntry('Cache', 'hit', { output: cachedCode });
  
  // Step 4: Parse succeeds
  console.log('--- Step 4: Babel Parse Attempt ---');
  tracer.addEntry('Babel', 'parse', { input: cachedCode, output: 'AST generated successfully' });
  
  tracer.complete(true);
  tracer.printTrace();
}

// ============================================================================
// LINE-BY-LINE EXECUTION TRACE
// ============================================================================

export function stepThroughCode(): void {
  console.log('\n📋 STEP-BY-STEP EXECUTION TRACE\n');
  console.log('Tracing through oracleCodeGenerator.ts -> LocalModelFallback.ts\n');
  
  const steps = [
    {
      file: 'createOracle.tsx',
      line: 215,
      code: 'const generatedCode = await generateOracleCode(prompt);',
      state: { prompt: 'hockey shift tracker', generatedCode: '(pending)' },
      note: 'User clicks generate, calls generateOracleCode()',
    },
    {
      file: 'oracleCodeGenerator.ts',
      line: 560,
      code: 'const costOptimization = LocalModelFallback.optimizeModel(userPrompt);',
      state: { recommendedModel: 'cached', reasoning: 'Cache hit found' },
      note: 'Checks for cached/local template match',
    },
    {
      file: 'oracleCodeGenerator.ts',
      line: 572,
      code: 'const inferResult = await LocalModelFallback.infer(userPrompt, SYSTEM_PROMPT);',
      state: { calling: 'LocalModelFallback.infer()' },
      note: 'Calls local model fallback for inference',
    },
    {
      file: 'LocalModelFallback.ts',
      line: 1230,
      code: 'const cached = this.responseCache.get(input);',
      state: { inputHash: 'abc123', cached: '(looking up)' },
      note: '🔴 BUG LOCATION: Cache returns corrupted data',
    },
    {
      file: 'LocalModelFallback.ts',
      line: 1232,
      code: 'if (cached) { return { success: true, output: cached.output, ... }; }',
      state: { cachedOutput: 'const [currentView, setCurrentView] = useStat.\n}', length: 205 },
      note: '🔴 Returns 205 chars (should be ~14,000)',
    },
    {
      file: 'oracleCodeGenerator.ts',
      line: 578,
      code: 'if (inferResult.success && inferResult.output && inferResult.output.length > 100)',
      state: { success: true, length: 205, passes: true },
      note: '⚠️  205 > 100, so check passes (threshold too low!)',
    },
    {
      file: 'oracleCodeGenerator.ts',
      line: 596,
      code: 'let processedCode = cleanGeneratedCode(rawCode);',
      state: { rawCode: '(205 chars)', processedCode: '(~180 chars after cleaning)' },
      note: 'Cleans but code is already truncated',
    },
    {
      file: 'createOracle.tsx',
      line: 222,
      code: 'console.log("[CreateOracle] Received code, length:", generatedCode.length);',
      state: { length: 205 },
      note: 'Receives truncated code',
    },
    {
      file: 'DynamicOracleRenderer.tsx',
      line: 716,
      code: 'astSanitize(preprocessed);',
      state: { error: 'Unexpected token (3:0)' },
      note: '🔴 Babel fails on "useStat." - incomplete identifier',
    },
  ];
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`STEP ${i + 1}: ${step.file}:${step.line}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`\nCode:\n  ${step.code}\n`);
    console.log(`State:\n  ${JSON.stringify(step.state, null, 2)}\n`);
    console.log(`📝 ${step.note}`);
  }
  
  console.log('\n\n🔍 ROOT CAUSE SUMMARY:');
  console.log('========================');
  console.log('1. API returned truncated code (network issue or timeout)');
  console.log('2. Cache stored truncated code without validation');
  console.log('3. Next request got cache hit with corrupted data');
  console.log('4. Babel failed to parse incomplete code');
  console.log('\n✅ FIX APPLIED:');
  console.log('1. Cache key changed (v1 -> v2) to invalidate old entries');
  console.log('2. Cache.set() validates code before storing');
  console.log('3. Cache.get() validates code before returning');
  console.log('4. API response validation rejects truncated responses');
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  PipelineTracer,
  detectCorruption,
  createBuggyCache,
  createFixedCache,
  simulateTruncatedAPIResponse,
  simulateValidAPIResponse,
};

// Run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  runFailureSimulation();
  runFixedSimulation();
  stepThroughCode();
}
