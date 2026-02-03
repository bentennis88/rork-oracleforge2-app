/**
 * SelfCorrectionEngine - Real-time feedback loops with automatic error correction
 * Detects anomalies and self-corrects without human input
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CorrectionResult {
  original: string;
  corrected: string;
  corrections: Correction[];
  confidence: number;
  iterations: number;
  stable: boolean;
}

export interface Correction {
  type: CorrectionType;
  description: string;
  before: string;
  after: string;
  fullAfter?: string; // Full corrected code (not truncated)
  line?: number;
  automatic: boolean;
}

export type CorrectionType =
  | 'syntax_fix'
  | 'null_safety'
  | 'type_coercion'
  | 'async_handling'
  | 'import_fix'
  | 'style_fix'
  | 'api_compatibility'
  | 'memory_optimization'
  | 'security_fix'
  | 'logic_fix';

export interface AnomalyDetection {
  hasAnomalies: boolean;
  anomalies: Anomaly[];
  riskLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
}

export interface Anomaly {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: { line: number; column: number };
  suggestedAction: string;
}

// ============================================================================
// CORRECTION RULES
// ============================================================================

interface CorrectionRule {
  id: string;
  name: string;
  type: CorrectionType;
  detect: RegExp | ((code: string) => boolean);
  fix: (code: string, match?: RegExpMatchArray) => string;
  priority: number;
  description: string;
}

const CORRECTION_RULES: CorrectionRule[] = [
  // ============ SYNTAX FIXES ============
  {
    id: 'fix_unclosed_string_single',
    name: 'Fix unclosed single quote string',
    type: 'syntax_fix',
    detect: /(?<!\\)'(?:[^'\\]|\\.)*$/m,
    fix: (code) => {
      // Find lines with unclosed single quotes and close them
      return code.replace(/^(.*(?<!\\)'(?:[^'\\]|\\.)*)$/gm, (match) => {
        const quoteCount = (match.match(/(?<!\\)'/g) || []).length;
        if (quoteCount % 2 !== 0) {
          return match + "'";
        }
        return match;
      });
    },
    priority: 100,
    description: 'Closes unclosed single-quoted strings',
  },
  {
    id: 'fix_unclosed_string_double',
    name: 'Fix unclosed double quote string',
    type: 'syntax_fix',
    detect: /(?<!\\)"(?:[^"\\]|\\.)*$/m,
    fix: (code) => {
      return code.replace(/^(.*(?<!\\)"(?:[^"\\]|\\.)*)$/gm, (match) => {
        const quoteCount = (match.match(/(?<!\\)"/g) || []).length;
        if (quoteCount % 2 !== 0) {
          return match + '"';
        }
        return match;
      });
    },
    priority: 100,
    description: 'Closes unclosed double-quoted strings',
  },
  {
    id: 'fix_unclosed_braces',
    name: 'Fix unclosed braces',
    type: 'syntax_fix',
    detect: (code) => {
      let count = 0;
      for (const char of code) {
        if (char === '{') count++;
        if (char === '}') count--;
      }
      return count > 0;
    },
    fix: (code) => {
      let openCount = 0;
      let closeCount = 0;
      for (const char of code) {
        if (char === '{') openCount++;
        if (char === '}') closeCount++;
      }
      const missing = openCount - closeCount;
      if (missing > 0) {
        return code + '\n' + '}'.repeat(missing);
      }
      return code;
    },
    priority: 95,
    description: 'Adds missing closing braces',
  },
  {
    id: 'fix_unclosed_parens',
    name: 'Fix unclosed parentheses',
    type: 'syntax_fix',
    detect: (code) => {
      let count = 0;
      for (const char of code) {
        if (char === '(') count++;
        if (char === ')') count--;
      }
      return count > 0;
    },
    fix: (code) => {
      let openCount = 0;
      let closeCount = 0;
      for (const char of code) {
        if (char === '(') openCount++;
        if (char === ')') closeCount++;
      }
      const missing = openCount - closeCount;
      if (missing > 0) {
        return code + ')'.repeat(missing);
      }
      return code;
    },
    priority: 95,
    description: 'Adds missing closing parentheses',
  },
  {
    id: 'fix_unclosed_brackets',
    name: 'Fix unclosed brackets',
    type: 'syntax_fix',
    detect: (code) => {
      let count = 0;
      for (const char of code) {
        if (char === '[') count++;
        if (char === ']') count--;
      }
      return count > 0;
    },
    fix: (code) => {
      let openCount = 0;
      let closeCount = 0;
      for (const char of code) {
        if (char === '[') openCount++;
        if (char === ']') closeCount++;
      }
      const missing = openCount - closeCount;
      if (missing > 0) {
        return code + ']'.repeat(missing);
      }
      return code;
    },
    priority: 95,
    description: 'Adds missing closing brackets',
  },
  {
    id: 'fix_trailing_comma_object',
    name: 'Fix trailing comma in object',
    type: 'syntax_fix',
    detect: /,\s*}/g,
    fix: (code) => code.replace(/,(\s*)}/g, '$1}'),
    priority: 80,
    description: 'Removes trailing commas before closing braces (for JSON compatibility)',
  },
  {
    id: 'fix_double_comma',
    name: 'Fix double commas',
    type: 'syntax_fix',
    detect: /,\s*,/g,
    fix: (code) => code.replace(/,\s*,/g, ','),
    priority: 85,
    description: 'Removes duplicate commas',
  },

  // ============ NULL SAFETY ============
  {
    id: 'fix_array_map_null',
    name: 'Add null check for array.map',
    type: 'null_safety',
    detect: /(\w+)\.map\s*\(/g,
    fix: (code) => {
      return code.replace(/(?<!\|\|\s*\[\]\)|\?\.)(\b\w+)\.map\s*\(/g, (match, varName) => {
        // Skip if already has null check or is a known safe method chain
        if (varName === 'Array' || varName === 'Object' || varName.startsWith('safe')) {
          return match;
        }
        return `(${varName} || []).map(`;
      });
    },
    priority: 70,
    description: 'Adds null safety for array map operations',
  },
  {
    id: 'fix_array_filter_null',
    name: 'Add null check for array.filter',
    type: 'null_safety',
    detect: /(\w+)\.filter\s*\(/g,
    fix: (code) => {
      return code.replace(/(?<!\|\|\s*\[\]\)|\?\.)(\b\w+)\.filter\s*\(/g, (match, varName) => {
        if (varName === 'Array' || varName === 'Object' || varName.startsWith('safe')) {
          return match;
        }
        return `(${varName} || []).filter(`;
      });
    },
    priority: 70,
    description: 'Adds null safety for array filter operations',
  },
  {
    id: 'fix_array_reduce_null',
    name: 'Add null check for array.reduce',
    type: 'null_safety',
    detect: /(\w+)\.reduce\s*\(/g,
    fix: (code) => {
      return code.replace(/(?<!\|\|\s*\[\]\)|\?\.)(\b\w+)\.reduce\s*\(/g, (match, varName) => {
        if (varName === 'Array' || varName === 'Object' || varName.startsWith('safe')) {
          return match;
        }
        return `(${varName} || []).reduce(`;
      });
    },
    priority: 70,
    description: 'Adds null safety for array reduce operations',
  },
  {
    id: 'fix_length_null',
    name: 'Add null check for .length',
    type: 'null_safety',
    detect: /(\w+)\.length(?!\s*[?])/g,
    fix: (code) => {
      return code.replace(/(?<!\|\|\s*['"`]\)|\?\.)(\b\w+)\.length(?!\s*[?])/g, (match, varName) => {
        if (varName === 'Array' || varName === 'Object' || varName.startsWith('safe') || varName === 'str' || varName === 'string') {
          return match;
        }
        return `(${varName} || []).length`;
      });
    },
    priority: 65,
    description: 'Adds null safety for length property access',
  },

  // ============ TYPE COERCION ============
  {
    id: 'fix_loose_equality',
    name: 'Fix loose equality',
    type: 'type_coercion',
    // Match == that is not part of === or !== 
    // Use word boundary and negative lookahead/lookbehind
    detect: /(?<![=!])==(?!=)/g,
    fix: (code) => code.replace(/(?<![=!])==(?!=)/g, '==='),
    priority: 50,
    description: 'Converts == to === for strict equality',
  },
  {
    id: 'fix_loose_inequality',
    name: 'Fix loose inequality',
    type: 'type_coercion',
    // Match != that is not part of !==
    detect: /(?<![=!])!=(?!=)/g,
    fix: (code) => code.replace(/(?<![=!])!=(?!=)/g, '!=='),
    priority: 50,
    description: 'Converts != to !== for strict inequality',
  },

  // ============ ASYNC HANDLING ============
  {
    id: 'fix_promise_no_catch',
    name: 'Add catch to promise chains',
    type: 'async_handling',
    detect: /\.then\s*\([^)]*\)(?!\s*\.catch)/g,
    fix: (code) => {
      // Add .catch() to promise chains that don't have one
      return code.replace(
        /(\.then\s*\([^)]*\))(?!\s*\.catch)(?!\s*\.then)/g,
        '$1.catch(e => console.error(e))'
      );
    },
    priority: 60,
    description: 'Adds error handling to promise chains',
  },

  // ============ IMPORT FIXES ============
  {
    id: 'fix_missing_react_import',
    name: 'Add React import',
    type: 'import_fix',
    detect: (code) => {
      return code.includes('useState') && !code.includes("from 'react'") && !code.includes('from "react"');
    },
    fix: (code) => {
      if (!code.includes("import React")) {
        return "import React, { useState, useEffect } from 'react';\n" + code;
      }
      return code;
    },
    priority: 90,
    description: 'Adds missing React import',
  },
  {
    id: 'fix_missing_asyncstorage_import',
    name: 'Add AsyncStorage import',
    type: 'import_fix',
    detect: (code) => {
      return code.includes('AsyncStorage') && !code.includes("from '@react-native-async-storage/async-storage'");
    },
    fix: (code) => {
      if (!code.includes("AsyncStorage from")) {
        const importLine = "import AsyncStorage from '@react-native-async-storage/async-storage';\n";
        // Add after other imports
        const lastImportMatch = code.match(/^import .+$/gm);
        if (lastImportMatch) {
          const lastImport = lastImportMatch[lastImportMatch.length - 1];
          return code.replace(lastImport, lastImport + '\n' + importLine.trim());
        }
        return importLine + code;
      }
      return code;
    },
    priority: 85,
    description: 'Adds missing AsyncStorage import',
  },

  // ============ STYLE FIXES ============
  {
    id: 'fix_fontweight_number',
    name: 'Fix fontWeight number value',
    type: 'style_fix',
    detect: /fontWeight:\s*(\d+)(?!['"])/g,
    fix: (code) => code.replace(/fontWeight:\s*(\d+)(?!['"])/g, "fontWeight: '$1'"),
    priority: 75,
    description: 'Converts numeric fontWeight to string',
  },
  {
    id: 'fix_flex_string',
    name: 'Fix flex string value',
    type: 'style_fix',
    detect: /flex:\s*['"](\d+)['"]/g,
    fix: (code) => code.replace(/flex:\s*['"](\d+)['"]/g, 'flex: $1'),
    priority: 75,
    description: 'Converts string flex to number',
  },

  // ============ API COMPATIBILITY ============
  {
    id: 'fix_localstorage',
    name: 'Replace localStorage with AsyncStorage',
    type: 'api_compatibility',
    detect: /\blocalStorage\./g,
    fix: (code) => {
      let result = code;
      result = result.replace(/localStorage\.setItem\s*\(\s*([^,]+),\s*([^)]+)\)/g, 
        'AsyncStorage.setItem($1, $2)');
      result = result.replace(/localStorage\.getItem\s*\(\s*([^)]+)\)/g,
        'AsyncStorage.getItem($1)');
      result = result.replace(/localStorage\.removeItem\s*\(\s*([^)]+)\)/g,
        'AsyncStorage.removeItem($1)');
      return result;
    },
    priority: 80,
    description: 'Replaces localStorage with AsyncStorage for React Native',
  },
  {
    id: 'fix_document_access',
    name: 'Remove document access',
    type: 'api_compatibility',
    detect: /\bdocument\.\w+/g,
    fix: (code) => {
      // Comment out document access lines
      return code.replace(/^(.*\bdocument\.\w+.*)$/gm, '// RN Incompatible: $1');
    },
    priority: 85,
    description: 'Removes DOM document access (not available in React Native)',
  },
  {
    id: 'fix_window_access',
    name: 'Remove window access',
    type: 'api_compatibility',
    detect: /\bwindow\.(?!alert|confirm)/g,
    fix: (code) => {
      return code.replace(/\bwindow\.innerWidth/g, "Dimensions.get('window').width");
      // More replacements can be added
    },
    priority: 85,
    description: 'Replaces window properties with React Native equivalents',
  },

  // ============ SECURITY FIXES ============
  {
    id: 'fix_eval_usage',
    name: 'Remove eval usage',
    type: 'security_fix',
    detect: /\beval\s*\(/g,
    fix: (code) => {
      return code.replace(/\beval\s*\(([^)]+)\)/g, '/* SECURITY: eval removed */ JSON.parse($1)');
    },
    priority: 100,
    description: 'Removes dangerous eval() calls',
  },
  {
    id: 'fix_innerhtml',
    name: 'Remove innerHTML',
    type: 'security_fix',
    detect: /\.innerHTML\s*=/g,
    fix: (code) => {
      return code.replace(/\.innerHTML\s*=\s*([^;]+);/g, '/* SECURITY: innerHTML removed */');
    },
    priority: 100,
    description: 'Removes dangerous innerHTML assignments',
  },

  // ============ LOGIC FIXES ============
  {
    id: 'fix_empty_catch',
    name: 'Add error logging to empty catch',
    type: 'logic_fix',
    detect: /catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g,
    fix: (code) => {
      return code.replace(
        /catch\s*\(\s*(\w*)\s*\)\s*\{\s*\}/g,
        (match, errorVar) => {
          const varName = errorVar || 'e';
          return `catch (${varName}) { console.error('Error:', ${varName}); }`;
        }
      );
    },
    priority: 60,
    description: 'Adds error logging to empty catch blocks',
  },
  {
    id: 'fix_console_in_jsx',
    name: 'Remove console.log from JSX',
    type: 'logic_fix',
    detect: /{\s*console\.\w+\([^}]*\)\s*}/g,
    fix: (code) => {
      return code.replace(/{\s*console\.\w+\([^}]*\)\s*}/g, '{null}');
    },
    priority: 55,
    description: 'Removes console statements from JSX render',
  },
];

// ============================================================================
// SELF CORRECTION ENGINE
// ============================================================================

class SelfCorrectionEngineImpl {
  private maxIterations = 10;
  private rules: CorrectionRule[];

  constructor() {
    // Sort rules by priority (highest first)
    this.rules = [...CORRECTION_RULES].sort((a, b) => b.priority - a.priority);
  }

  // ==========================================================================
  // MAIN CORRECTION PIPELINE
  // ==========================================================================

  correct(code: string): CorrectionResult {
    let currentCode = code;
    const allCorrections: Correction[] = [];
    let iteration = 0;
    let previousCode = '';

    console.log('[SelfCorrectionEngine] Starting correction pipeline');

    while (iteration < this.maxIterations && currentCode !== previousCode) {
      previousCode = currentCode;
      const iterationCorrections = this.applyRules(currentCode);

      if (iterationCorrections.length === 0) {
        break;
      }

      for (const correction of iterationCorrections) {
        // Use fullAfter (full code) not after (truncated preview)
        currentCode = correction.fullAfter || correction.after;
        allCorrections.push(correction);
      }

      iteration++;
    }

    const stable = currentCode === previousCode;
    const confidence = this.calculateConfidence(allCorrections, stable, iteration);

    console.log('[SelfCorrectionEngine] Completed:', {
      corrections: allCorrections.length,
      iterations: iteration,
      stable,
      confidence,
    });

    return {
      original: code,
      corrected: currentCode,
      corrections: allCorrections,
      confidence,
      iterations: iteration,
      stable,
    };
  }

  private applyRules(code: string): Correction[] {
    const corrections: Correction[] = [];

    for (const rule of this.rules) {
      const detected = typeof rule.detect === 'function' 
        ? rule.detect(code)
        : rule.detect.test(code);

      if (detected) {
        const before = code;
        const after = rule.fix(code);

        if (before !== after) {
          corrections.push({
            type: rule.type,
            description: rule.description,
            before: before.substring(0, 200) + (before.length > 200 ? '...' : ''),
            after: after.substring(0, 200) + (after.length > 200 ? '...' : ''),
            fullAfter: after, // Store full code for actual use
            automatic: true,
          });

          // Apply this correction and continue
          code = after;
        }
      }
    }

    return corrections;
  }

  // ==========================================================================
  // ANOMALY DETECTION
  // ==========================================================================

  detectAnomalies(code: string): AnomalyDetection {
    const anomalies: Anomaly[] = [];

    // Check for infinite loops
    const infiniteLoopPattern = /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/g;
    if (infiniteLoopPattern.test(code)) {
      anomalies.push({
        type: 'infinite_loop',
        severity: 'critical',
        description: 'Potential infinite loop detected',
        suggestedAction: 'Add break condition or timeout',
      });
    }

    // Check for memory leaks (setInterval without cleanup)
    if (code.includes('setInterval') && !code.includes('clearInterval')) {
      anomalies.push({
        type: 'memory_leak',
        severity: 'high',
        description: 'setInterval without clearInterval may cause memory leak',
        suggestedAction: 'Add cleanup in useEffect return',
      });
    }

    // Check for setTimeout without cleanup
    if (code.includes('setTimeout') && !code.includes('clearTimeout') && code.includes('useEffect')) {
      anomalies.push({
        type: 'memory_leak',
        severity: 'medium',
        description: 'setTimeout in useEffect without cleanup',
        suggestedAction: 'Store timeout ID and clear in cleanup',
      });
    }

    // Check for state updates in render
    const stateInRender = /return\s*\([\s\S]*setState[\s\S]*\)/g;
    if (stateInRender.test(code)) {
      anomalies.push({
        type: 'render_loop',
        severity: 'critical',
        description: 'State update in render may cause infinite loop',
        suggestedAction: 'Move state update to useEffect or event handler',
      });
    }

    // Check for sync heavy operations
    const heavyOps = /JSON\.parse\s*\([^)]{1000,}\)|\.map\([^)]+\)\.map\([^)]+\)\.map/g;
    if (heavyOps.test(code)) {
      anomalies.push({
        type: 'performance',
        severity: 'medium',
        description: 'Heavy synchronous operation detected',
        suggestedAction: 'Consider memoization or async processing',
      });
    }

    // Check for hardcoded sensitive data
    const sensitivePatterns = [
      /api[_-]?key\s*[:=]\s*['"][^'"]{20,}['"]/gi,
      /password\s*[:=]\s*['"][^'"]+['"]/gi,
      /secret\s*[:=]\s*['"][^'"]+['"]/gi,
    ];
    for (const pattern of sensitivePatterns) {
      if (pattern.test(code)) {
        anomalies.push({
          type: 'security',
          severity: 'critical',
          description: 'Hardcoded sensitive data detected',
          suggestedAction: 'Move to environment variables',
        });
        break;
      }
    }

    // Check for missing error boundaries
    if (code.includes('class') && code.includes('extends') && code.includes('Component')) {
      if (!code.includes('componentDidCatch') && !code.includes('ErrorBoundary')) {
        anomalies.push({
          type: 'error_handling',
          severity: 'low',
          description: 'Class component without error boundary',
          suggestedAction: 'Add componentDidCatch or wrap in ErrorBoundary',
        });
      }
    }

    // Determine risk level
    let riskLevel: AnomalyDetection['riskLevel'] = 'none';
    if (anomalies.some(a => a.severity === 'critical')) {
      riskLevel = 'critical';
    } else if (anomalies.some(a => a.severity === 'high')) {
      riskLevel = 'high';
    } else if (anomalies.some(a => a.severity === 'medium')) {
      riskLevel = 'medium';
    } else if (anomalies.length > 0) {
      riskLevel = 'low';
    }

    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
      riskLevel,
    };
  }

  // ==========================================================================
  // CONFIDENCE CALCULATION
  // ==========================================================================

  private calculateConfidence(
    corrections: Correction[],
    stable: boolean,
    iterations: number
  ): number {
    let confidence = 1.0;

    // Reduce confidence for each correction applied
    confidence -= corrections.length * 0.02;

    // Reduce confidence for non-stability
    if (!stable) {
      confidence -= 0.2;
    }

    // Reduce confidence for many iterations
    confidence -= (iterations - 1) * 0.05;

    // Reduce confidence for critical fixes
    const criticalFixes = corrections.filter(c => 
      c.type === 'security_fix' || c.type === 'syntax_fix'
    ).length;
    confidence -= criticalFixes * 0.05;

    return Math.max(0, Math.min(1, confidence));
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  addRule(rule: CorrectionRule): void {
    this.rules.push(rule);
    this.rules.sort((a, b) => b.priority - a.priority);
  }

  setMaxIterations(max: number): void {
    this.maxIterations = max;
  }
}

// Singleton instance
export const SelfCorrectionEngine = new SelfCorrectionEngineImpl();
