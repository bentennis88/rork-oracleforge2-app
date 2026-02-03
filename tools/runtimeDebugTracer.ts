/**
 * Runtime Debug Tracer for Code Generation Pipeline
 * 
 * Inject this into the actual codebase to trace execution in real-time.
 * Logs every step with variable states, enabling pinpoint debugging.
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

const DEBUG_CONFIG = {
  enabled: true,
  logToConsole: true,
  maxEntries: 1000,
  truncateOutputAt: 200,
  detectCorruption: true,
};

// ============================================================================
// TRACE STORAGE
// ============================================================================

interface TraceEntry {
  id: number;
  timestamp: number;
  level: 'info' | 'warn' | 'error' | 'debug';
  component: string;
  function: string;
  message: string;
  data?: Record<string, any>;
  codeSnapshot?: {
    length: number;
    preview: string;
    hasExportDefault: boolean;
    isTruncated: boolean;
    truncationReason?: string;
  };
}

class DebugTracer {
  private static instance: DebugTracer;
  private entries: TraceEntry[] = [];
  private entryId = 0;
  private startTime = Date.now();
  
  static getInstance(): DebugTracer {
    if (!DebugTracer.instance) {
      DebugTracer.instance = new DebugTracer();
    }
    return DebugTracer.instance;
  }
  
  reset(): void {
    this.entries = [];
    this.entryId = 0;
    this.startTime = Date.now();
  }
  
  trace(
    component: string,
    fn: string,
    message: string,
    data?: Record<string, any>,
    level: TraceEntry['level'] = 'info'
  ): void {
    if (!DEBUG_CONFIG.enabled) return;
    
    const entry: TraceEntry = {
      id: ++this.entryId,
      timestamp: Date.now() - this.startTime,
      level,
      component,
      function: fn,
      message,
      data,
    };
    
    // Check if any data field contains code
    if (data) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'string' && (key.includes('code') || key.includes('output') || value.length > 100)) {
          entry.codeSnapshot = this.analyzeCode(value);
          break;
        }
      }
    }
    
    this.entries.push(entry);
    
    // Limit entries
    if (this.entries.length > DEBUG_CONFIG.maxEntries) {
      this.entries.shift();
    }
    
    // Log to console
    if (DEBUG_CONFIG.logToConsole) {
      this.logEntry(entry);
    }
  }
  
  private analyzeCode(code: string): TraceEntry['codeSnapshot'] {
    const truncationCheck = this.detectTruncation(code);
    
    return {
      length: code.length,
      preview: code.substring(0, DEBUG_CONFIG.truncateOutputAt) + (code.length > DEBUG_CONFIG.truncateOutputAt ? '...' : ''),
      hasExportDefault: code.includes('export default'),
      isTruncated: truncationCheck.isTruncated,
      truncationReason: truncationCheck.reason,
    };
  }
  
  private detectTruncation(code: string): { isTruncated: boolean; reason?: string } {
    if (!code) {
      return { isTruncated: true, reason: 'Code is empty' };
    }
    
    if (code.length < 500) {
      return { isTruncated: true, reason: `Too short: ${code.length} chars` };
    }
    
    // Check for truncation signatures
    const signatures = ['useStat.', 'useEff.', 'setS.', 'AsyncSto.', 'StyleShe.'];
    for (const sig of signatures) {
      if (code.includes(sig)) {
        return { isTruncated: true, reason: `Found truncation signature: "${sig}"` };
      }
    }
    
    // Check if ends mid-statement
    const trimmed = code.trim();
    if (trimmed.endsWith('.') || trimmed.endsWith('=') || trimmed.endsWith('(')) {
      return { isTruncated: true, reason: `Ends mid-statement: "${trimmed.slice(-30)}"` };
    }
    
    if (!code.includes('export default')) {
      return { isTruncated: true, reason: 'Missing export default' };
    }
    
    return { isTruncated: false };
  }
  
  private logEntry(entry: TraceEntry): void {
    const icons = {
      info: 'ℹ️',
      warn: '⚠️',
      error: '❌',
      debug: '🔍',
    };
    
    const icon = icons[entry.level];
    const time = `[${entry.timestamp}ms]`;
    const location = `${entry.component}::${entry.function}`;
    
    let logMessage = `${icon} ${time} ${location}: ${entry.message}`;
    
    if (entry.codeSnapshot) {
      const cs = entry.codeSnapshot;
      if (cs.isTruncated) {
        logMessage += `\n   🚨 TRUNCATED! ${cs.truncationReason}`;
        logMessage += `\n   Length: ${cs.length}, HasExport: ${cs.hasExportDefault}`;
      } else {
        logMessage += `\n   ✓ Code OK (${cs.length} chars)`;
      }
    }
    
    switch (entry.level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      default:
        console.log(logMessage);
    }
  }
  
  // =========================================================================
  // ANALYSIS METHODS
  // =========================================================================
  
  findCorruptionPoint(): TraceEntry | null {
    return this.entries.find(e => e.codeSnapshot?.isTruncated) || null;
  }
  
  getTimeline(): string {
    const lines: string[] = ['=== EXECUTION TIMELINE ===\n'];
    
    for (const entry of this.entries) {
      const time = String(entry.timestamp).padStart(6, ' ');
      const status = entry.codeSnapshot?.isTruncated ? '❌' : entry.level === 'error' ? '❌' : '✓';
      lines.push(`[${time}ms] ${status} ${entry.component}::${entry.function} - ${entry.message}`);
      
      if (entry.codeSnapshot?.isTruncated) {
        lines.push(`          └─ 🚨 ${entry.codeSnapshot.truncationReason}`);
      }
    }
    
    return lines.join('\n');
  }
  
  getCorruptionReport(): string {
    const corrupt = this.findCorruptionPoint();
    
    if (!corrupt) {
      return '✅ No corruption detected in this trace.';
    }
    
    return `
🚨 CORRUPTION DETECTED

Location: ${corrupt.component}::${corrupt.function}
Time: ${corrupt.timestamp}ms into execution
Message: ${corrupt.message}
Reason: ${corrupt.codeSnapshot?.truncationReason}

Code Length: ${corrupt.codeSnapshot?.length}
Has Export: ${corrupt.codeSnapshot?.hasExportDefault}
Preview: ${corrupt.codeSnapshot?.preview}

DATA: ${JSON.stringify(corrupt.data, null, 2)}
`;
  }
  
  exportTrace(): TraceEntry[] {
    return [...this.entries];
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export const Tracer = DebugTracer.getInstance();

export function trace(
  component: string,
  fn: string,
  message: string,
  data?: Record<string, any>
): void {
  Tracer.trace(component, fn, message, data, 'info');
}

export function traceWarn(
  component: string,
  fn: string,
  message: string,
  data?: Record<string, any>
): void {
  Tracer.trace(component, fn, message, data, 'warn');
}

export function traceError(
  component: string,
  fn: string,
  message: string,
  data?: Record<string, any>
): void {
  Tracer.trace(component, fn, message, data, 'error');
}

export function traceCode(
  component: string,
  fn: string,
  code: string,
  label: string = 'code'
): void {
  Tracer.trace(component, fn, `Code checkpoint: ${label}`, { [label]: code }, 'debug');
}

// ============================================================================
// INJECTION POINTS - Add these to actual code
// ============================================================================

/**
 * USAGE EXAMPLE:
 * 
 * In oracleCodeGenerator.ts:
 * 
 * import { trace, traceCode, traceError, Tracer } from '../tools/runtimeDebugTracer';
 * 
 * export async function generateOracleCode(userPrompt: string): Promise<string> {
 *   Tracer.reset(); // Start fresh trace
 *   
 *   trace('OracleCodeGen', 'generateOracleCode', 'Starting generation', { userPrompt });
 *   
 *   // ... existing code ...
 *   
 *   const inferResult = await LocalModelFallback.infer(userPrompt, SYSTEM_PROMPT);
 *   traceCode('OracleCodeGen', 'generateOracleCode', inferResult.output, 'inferOutput');
 *   
 *   // ... more code ...
 *   
 *   // Before returning:
 *   traceCode('OracleCodeGen', 'generateOracleCode', processedCode, 'finalOutput');
 *   console.log(Tracer.getCorruptionReport());
 *   
 *   return processedCode;
 * }
 * 
 * 
 * In LocalModelFallback.ts:
 * 
 * async infer(...): Promise<InferenceResult> {
 *   trace('LocalModelFallback', 'infer', 'Checking cache', { inputLength: input.length });
 *   
 *   const cached = this.responseCache.get(input);
 *   if (cached) {
 *     traceCode('LocalModelFallback', 'infer', cached.output, 'cachedOutput');
 *     // ... if corrupted, this will be flagged in the trace
 *   }
 *   
 *   // ...
 * }
 */

export default Tracer;
