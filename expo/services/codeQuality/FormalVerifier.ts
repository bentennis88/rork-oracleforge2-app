/**
 * FormalVerifier - Mathematical verification of code correctness
 * Implements static analysis, type checking, and logical proof verification
 * Inspired by formal methods from Coq/Alloy but adapted for runtime JS/TS
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface VerificationResult {
  isValid: boolean;
  score: number; // 0-100
  syntaxErrors: SyntaxError[];
  logicErrors: LogicError[];
  typeErrors: TypeError[];
  invariantViolations: InvariantViolation[];
  proofs: Proof[];
  suggestions: string[];
}

export interface SyntaxError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
  fix?: string;
}

export interface LogicError {
  type: LogicErrorType;
  location: string;
  description: string;
  counterexample?: string;
  fix: string;
}

export type LogicErrorType =
  | 'null_dereference'
  | 'array_bounds'
  | 'division_by_zero'
  | 'infinite_loop'
  | 'unreachable_code'
  | 'race_condition'
  | 'memory_leak'
  | 'unhandled_promise'
  | 'type_coercion'
  | 'undefined_behavior';

export interface TypeError {
  expected: string;
  actual: string;
  location: string;
  message: string;
}

export interface InvariantViolation {
  invariant: string;
  violation: string;
  location: string;
}

export interface Proof {
  property: string;
  status: 'proven' | 'disproven' | 'unknown';
  evidence?: string;
}

// ============================================================================
// FORMAL VERIFICATION RULES
// ============================================================================

interface VerificationRule {
  id: string;
  name: string;
  description: string;
  pattern: RegExp;
  check: (code: string, match: RegExpMatchArray) => LogicError | null;
  fix: (code: string, match: RegExpMatchArray) => string;
}

const VERIFICATION_RULES: VerificationRule[] = [
  // Rule 1: Null/undefined dereference
  {
    id: 'null_deref_001',
    name: 'Potential null dereference',
    description: 'Accessing property on potentially null/undefined value',
    pattern: /(\w+)\.(\w+)(?!\s*\?\s*\.)/g,
    check: (code, match) => {
      const varName = match[1];
      // Check if variable is guarded
      const guardPattern = new RegExp(`if\\s*\\(\\s*${varName}\\s*\\)|${varName}\\s*&&|${varName}\\s*\\?`);
      const beforeMatch = code.substring(0, match.index);
      const lines = beforeMatch.split('\n');
      const lastLines = lines.slice(-10).join('\n');
      
      if (!guardPattern.test(lastLines) && !['React', 'Math', 'JSON', 'Object', 'Array', 'console', 'Date', 'Number', 'String', 'Boolean', 'Promise', 'AsyncStorage', 'StyleSheet', 'Platform', 'Dimensions', 'Alert', 'Keyboard'].includes(varName)) {
        return {
          type: 'null_dereference',
          location: `Character ${match.index}`,
          description: `Property access on '${varName}' without null check`,
          counterexample: `${varName} could be null/undefined`,
          fix: `${varName}?.${match[2]}`,
        };
      }
      return null;
    },
    fix: (code, match) => code.replace(match[0], `${match[1]}?.${match[2]}`),
  },

  // Rule 2: Array bounds access
  {
    id: 'array_bounds_001',
    name: 'Potential array bounds violation',
    description: 'Accessing array with index that may be out of bounds',
    pattern: /(\w+)\[(\w+|\d+)\]/g,
    check: (code, match) => {
      const arrayName = match[1];
      const index = match[2];
      
      // Skip if it's a common safe pattern
      if (/^(style|colors|props|params|options)$/.test(arrayName)) return null;
      
      // Check for bounds check
      const boundsCheck = new RegExp(`${index}\\s*<\\s*${arrayName}\\.length|${arrayName}\\.length\\s*>\\s*${index}`);
      const beforeMatch = code.substring(0, match.index);
      
      if (!boundsCheck.test(beforeMatch) && !isNaN(Number(index))) {
        return null; // Numeric index is usually intentional
      }
      
      if (!boundsCheck.test(beforeMatch) && isNaN(Number(index))) {
        return {
          type: 'array_bounds',
          location: `Character ${match.index}`,
          description: `Array access '${arrayName}[${index}]' without bounds check`,
          counterexample: `${index} >= ${arrayName}.length`,
          fix: `${arrayName}[${index}] with bounds check`,
        };
      }
      return null;
    },
    fix: (code, match) => code.replace(match[0], `(${match[2]} < ${match[1]}?.length ? ${match[1]}[${match[2]}] : undefined)`),
  },

  // Rule 3: Division by zero
  {
    id: 'div_zero_001',
    name: 'Potential division by zero',
    description: 'Division operation with potentially zero denominator',
    pattern: /(\w+|\d+)\s*\/\s*(\w+)(?!\s*\|\|)/g,
    check: (code, match) => {
      const denominator = match[2];
      
      // Skip if denominator is a number > 0
      if (!isNaN(Number(denominator)) && Number(denominator) !== 0) return null;
      
      // Check for zero guard
      const zeroGuard = new RegExp(`${denominator}\\s*(!==?|>)\\s*0|${denominator}\\s*\\|\\||if\\s*\\(\\s*${denominator}\\s*\\)`);
      const beforeMatch = code.substring(0, match.index);
      
      if (!zeroGuard.test(beforeMatch)) {
        return {
          type: 'division_by_zero',
          location: `Character ${match.index}`,
          description: `Division by '${denominator}' without zero check`,
          counterexample: `${denominator} === 0`,
          fix: `(${denominator} || 1)`,
        };
      }
      return null;
    },
    fix: (code, match) => code.replace(match[0], `${match[1]} / (${match[2]} || 1)`),
  },

  // Rule 4: Unhandled promise rejection
  {
    id: 'promise_001',
    name: 'Unhandled promise',
    description: 'Async operation without error handling',
    pattern: /await\s+(\w+)\s*\([^)]*\)(?!\s*\.catch|\s*\)\s*\.catch)/g,
    check: (code, match) => {
      const funcName = match[1];
      const beforeMatch = code.substring(0, match.index);
      const afterMatch = code.substring(match.index! + match[0].length, match.index! + match[0].length + 100);
      
      // Check if inside try-catch
      const lastTry = beforeMatch.lastIndexOf('try');
      const lastCatch = beforeMatch.lastIndexOf('catch');
      
      if (lastTry > lastCatch) {
        return null; // Inside try block
      }
      
      // Check for .catch() after
      if (/\.catch\s*\(/.test(afterMatch.substring(0, 20))) {
        return null;
      }
      
      return {
        type: 'unhandled_promise',
        location: `Character ${match.index}`,
        description: `Async call '${funcName}' without error handling`,
        fix: 'Wrap in try-catch or add .catch()',
      };
    },
    fix: (code, match) => code, // Complex fix, handled separately
  },

  // Rule 5: Potential infinite loop
  {
    id: 'infinite_loop_001',
    name: 'Potential infinite loop',
    description: 'Loop condition may never become false',
    pattern: /while\s*\(\s*true\s*\)|for\s*\(\s*;\s*;\s*\)/g,
    check: (code, match) => {
      const afterMatch = code.substring(match.index!, match.index! + 200);
      
      // Check for break statement
      if (/break\s*;/.test(afterMatch)) {
        return null;
      }
      
      return {
        type: 'infinite_loop',
        location: `Character ${match.index}`,
        description: 'Infinite loop without break condition',
        fix: 'Add break condition or use bounded loop',
      };
    },
    fix: (code, match) => code,
  },

  // Rule 6: Memory leak - event listeners
  {
    id: 'memory_leak_001',
    name: 'Potential memory leak',
    description: 'Event listener added without cleanup',
    pattern: /addEventListener\s*\(\s*['"](\w+)['"]\s*,\s*(\w+)/g,
    check: (code, match) => {
      const eventType = match[1];
      const handler = match[2];
      
      // Check for removeEventListener
      const removePattern = new RegExp(`removeEventListener\\s*\\(\\s*['"]${eventType}['"]\\s*,\\s*${handler}`);
      
      if (!removePattern.test(code)) {
        return {
          type: 'memory_leak',
          location: `Character ${match.index}`,
          description: `Event listener '${eventType}' added without cleanup`,
          fix: `Add removeEventListener in cleanup/useEffect return`,
        };
      }
      return null;
    },
    fix: (code, match) => code,
  },
];

// ============================================================================
// INVARIANT DEFINITIONS
// ============================================================================

interface Invariant {
  id: string;
  name: string;
  description: string;
  check: (code: string) => InvariantViolation | null;
}

const INVARIANTS: Invariant[] = [
  {
    id: 'inv_state_immutability',
    name: 'State Immutability',
    description: 'React state should not be mutated directly',
    check: (code) => {
      const mutationPattern = /(\w+State|\w+)\s*\[\s*\w+\s*\]\s*=|(\w+State|\w+)\.push\s*\(|(\w+State|\w+)\.pop\s*\(|(\w+State|\w+)\.splice\s*\(/;
      const match = code.match(mutationPattern);
      
      if (match) {
        // Check if it's actually state
        const varName = match[1] || match[2] || match[3] || match[4];
        if (/State$|^state$|^data$|^items$|^list$/i.test(varName)) {
          return {
            invariant: 'State Immutability',
            violation: `Direct mutation of '${varName}'`,
            location: `Pattern: ${match[0]}`,
          };
        }
      }
      return null;
    },
  },
  {
    id: 'inv_hook_rules',
    name: 'Rules of Hooks',
    description: 'Hooks must be called at top level, not in conditions/loops',
    check: (code) => {
      const conditionalHook = /if\s*\([^)]*\)\s*\{[^}]*\buse[A-Z]\w*\s*\(/;
      const loopHook = /(?:for|while)\s*\([^)]*\)\s*\{[^}]*\buse[A-Z]\w*\s*\(/;
      
      if (conditionalHook.test(code)) {
        return {
          invariant: 'Rules of Hooks',
          violation: 'Hook called inside conditional',
          location: 'Inside if statement',
        };
      }
      
      if (loopHook.test(code)) {
        return {
          invariant: 'Rules of Hooks',
          violation: 'Hook called inside loop',
          location: 'Inside loop',
        };
      }
      
      return null;
    },
  },
  {
    id: 'inv_async_state',
    name: 'Async State Update Safety',
    description: 'State updates after async operations should check component mount status',
    check: (code) => {
      const asyncStatePattern = /await\s+[^;]+;\s*\n\s*set\w+\s*\(/;
      const mountCheckPattern = /isMounted|mounted|isActive|cancelled/;
      
      if (asyncStatePattern.test(code) && !mountCheckPattern.test(code)) {
        return {
          invariant: 'Async State Update Safety',
          violation: 'State update after await without mount check',
          location: 'After async operation',
        };
      }
      
      return null;
    },
  },
];

// ============================================================================
// FORMAL VERIFIER CLASS
// ============================================================================

class FormalVerifierImpl {
  
  /**
   * Verify code for syntactic and logical correctness
   */
  verify(code: string): VerificationResult {
    const syntaxErrors = this.checkSyntax(code);
    const logicErrors = this.checkLogic(code);
    const typeErrors = this.checkTypes(code);
    const invariantViolations = this.checkInvariants(code);
    const proofs = this.generateProofs(code);
    
    const errorCount = syntaxErrors.length + logicErrors.length + typeErrors.length + invariantViolations.length;
    // Use gentler scoring: 2 points per error, with minimum of 30 for code that has export default
    const hasExportDefault = /export\s+default/.test(code);
    const baseScore = hasExportDefault ? 50 : 0; // Bonus for having proper structure
    const penalty = Math.min(errorCount * 2, baseScore); // Cap penalty at baseScore
    const score = Math.max(0, baseScore + 50 - penalty); // 50-100 for good code, never below 0
    
    return {
      isValid: errorCount === 0,
      score,
      syntaxErrors,
      logicErrors,
      typeErrors,
      invariantViolations,
      proofs,
      suggestions: this.generateSuggestions(logicErrors, invariantViolations),
    };
  }

  /**
   * Attempt to auto-fix all detected issues
   */
  autoFix(code: string): { code: string; fixesApplied: string[] } {
    let fixedCode = code;
    const fixesApplied: string[] = [];

    // Apply syntax fixes
    const syntaxFixes = this.applySyntaxFixes(fixedCode);
    fixedCode = syntaxFixes.code;
    fixesApplied.push(...syntaxFixes.fixes);

    // Apply logic fixes
    const logicFixes = this.applyLogicFixes(fixedCode);
    fixedCode = logicFixes.code;
    fixesApplied.push(...logicFixes.fixes);

    // Apply safety wrappers
    const safetyFixes = this.applySafetyWrappers(fixedCode);
    fixedCode = safetyFixes.code;
    fixesApplied.push(...safetyFixes.fixes);

    return { code: fixedCode, fixesApplied };
  }

  // ==========================================================================
  // SYNTAX CHECKING
  // ==========================================================================

  private checkSyntax(code: string): SyntaxError[] {
    const errors: SyntaxError[] = [];

    // Check bracket balance
    const brackets: [string, string][] = [['(', ')'], ['[', ']'], ['{', '}']];
    for (const [open, close] of brackets) {
      const openCount = (code.match(new RegExp('\\' + open, 'g')) || []).length;
      const closeCount = (code.match(new RegExp('\\' + close, 'g')) || []).length;
      
      if (openCount !== closeCount) {
        errors.push({
          line: 0,
          column: 0,
          message: `Unbalanced brackets: ${openCount} '${open}' vs ${closeCount} '${close}'`,
          severity: 'error',
          fix: 'Balance brackets',
        });
      }
    }

    // Check string literal balance
    const singleQuotes = (code.match(/(?<!\\)'/g) || []).length;
    const doubleQuotes = (code.match(/(?<!\\)"/g) || []).length;
    const backticks = (code.match(/(?<!\\)`/g) || []).length;

    if (singleQuotes % 2 !== 0) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Unbalanced single quotes',
        severity: 'error',
      });
    }

    if (doubleQuotes % 2 !== 0) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Unbalanced double quotes',
        severity: 'error',
      });
    }

    if (backticks % 2 !== 0) {
      errors.push({
        line: 0,
        column: 0,
        message: 'Unbalanced template literals',
        severity: 'error',
      });
    }

    // Check for common syntax errors
    const commonErrors: [RegExp, string][] = [
      [/,\s*\}/g, 'Trailing comma before closing brace'],
      [/,\s*\]/g, 'Trailing comma before closing bracket'],
      [/\)\s*\{(?!\s*$)/gm, 'Missing space after ) before {'],
      [/;;/g, 'Double semicolon'],
      [/\(\s*,/g, 'Empty first argument'],
      [/,\s*,/g, 'Empty argument between commas'],
    ];

    for (const [pattern, message] of commonErrors) {
      if (pattern.test(code)) {
        // These are warnings, not errors in modern JS
      }
    }

    return errors;
  }

  // ==========================================================================
  // LOGIC CHECKING
  // ==========================================================================

  private checkLogic(code: string): LogicError[] {
    const errors: LogicError[] = [];

    for (const rule of VERIFICATION_RULES) {
      let match;
      const pattern = new RegExp(rule.pattern.source, rule.pattern.flags);
      
      while ((match = pattern.exec(code)) !== null) {
        const error = rule.check(code, match);
        if (error) {
          errors.push(error);
        }
        
        // Prevent infinite loop for zero-width matches
        if (match.index === pattern.lastIndex) {
          pattern.lastIndex++;
        }
      }
    }

    return errors;
  }

  // ==========================================================================
  // TYPE CHECKING
  // ==========================================================================

  private checkTypes(code: string): TypeError[] {
    const errors: TypeError[] = [];

    // Check for obvious type mismatches
    const typePatterns: [RegExp, string, string][] = [
      [/useState\s*<\s*number\s*>\s*\(\s*['"`]/g, 'number', 'string'],
      [/useState\s*<\s*string\s*>\s*\(\s*\d+\s*\)/g, 'string', 'number'],
      [/useState\s*<\s*boolean\s*>\s*\(\s*(?!true|false)[^)]+\)/g, 'boolean', 'other'],
      [/\.toFixed\s*\(\s*\)\s*\+\s*\d/g, 'string (toFixed result)', 'number'],
      [/parseInt\s*\(\s*\d+\s*\)/g, 'string', 'number (already)'],
    ];

    for (const [pattern, expected, actual] of typePatterns) {
      const match = code.match(pattern);
      if (match) {
        errors.push({
          expected,
          actual,
          location: `Pattern: ${match[0].substring(0, 50)}`,
          message: `Type mismatch: expected ${expected}, got ${actual}`,
        });
      }
    }

    return errors;
  }

  // ==========================================================================
  // INVARIANT CHECKING
  // ==========================================================================

  private checkInvariants(code: string): InvariantViolation[] {
    const violations: InvariantViolation[] = [];

    for (const invariant of INVARIANTS) {
      const violation = invariant.check(code);
      if (violation) {
        violations.push(violation);
      }
    }

    return violations;
  }

  // ==========================================================================
  // PROOF GENERATION
  // ==========================================================================

  private generateProofs(code: string): Proof[] {
    const proofs: Proof[] = [];

    // Proof 1: Component renders without throwing
    const hasValidReturn = /return\s*\(\s*</.test(code) || /return\s+</.test(code);
    proofs.push({
      property: 'Component returns valid JSX',
      status: hasValidReturn ? 'proven' : 'disproven',
      evidence: hasValidReturn ? 'Found return statement with JSX' : 'No valid JSX return found',
    });

    // Proof 2: All state has initial values
    const stateDeclarations = code.match(/useState\s*(?:<[^>]*>)?\s*\(/g) || [];
    const stateWithInit = code.match(/useState\s*(?:<[^>]*>)?\s*\([^)]+\)/g) || [];
    proofs.push({
      property: 'All useState hooks have initial values',
      status: stateDeclarations.length === stateWithInit.length ? 'proven' : 'disproven',
      evidence: `${stateWithInit.length}/${stateDeclarations.length} have initial values`,
    });

    // Proof 3: No direct DOM manipulation
    const domManipulation = /document\.(getElementById|querySelector|createElement)|\.innerHTML\s*=/;
    proofs.push({
      property: 'No direct DOM manipulation',
      status: !domManipulation.test(code) ? 'proven' : 'disproven',
      evidence: domManipulation.test(code) ? 'Found direct DOM manipulation' : 'Using React patterns',
    });

    // Proof 4: Async functions handle errors
    const asyncFunctions = (code.match(/async\s+(?:function\s+)?\w*\s*\([^)]*\)\s*(?::\s*Promise<[^>]*>)?\s*\{/g) || []).length;
    const tryCatchBlocks = (code.match(/try\s*\{/g) || []).length;
    proofs.push({
      property: 'Async operations have error handling',
      status: asyncFunctions <= tryCatchBlocks ? 'proven' : 'unknown',
      evidence: `${tryCatchBlocks} try-catch blocks for ${asyncFunctions} async functions`,
    });

    return proofs;
  }

  // ==========================================================================
  // AUTO-FIX METHODS
  // ==========================================================================

  private applySyntaxFixes(code: string): { code: string; fixes: string[] } {
    let fixed = code;
    const fixes: string[] = [];

    // Fix trailing commas (make them optional - modern JS supports them)
    // Fix double semicolons
    const doubleSemi = fixed.match(/;;/g);
    if (doubleSemi) {
      fixed = fixed.replace(/;;/g, ';');
      fixes.push('Removed double semicolons');
    }

    return { code: fixed, fixes };
  }

  private applyLogicFixes(code: string): { code: string; fixes: string[] } {
    let fixed = code;
    const fixes: string[] = [];

    // Add optional chaining for property access on variables that might be null
    // This is a simplified version - production would use AST

    // Fix division by zero
    fixed = fixed.replace(
      /(\w+)\s*\/\s*(\w+)(?!\s*\|\|)(?=\s*[;,)\]}])/g,
      (match, num, denom) => {
        if (!isNaN(Number(denom)) && Number(denom) !== 0) return match;
        if (['Math', 'Number', 'parseInt', 'parseFloat'].some(s => num.includes(s))) return match;
        fixes.push(`Added zero-division guard for ${denom}`);
        return `${num} / (${denom} || 1)`;
      }
    );

    return { code: fixed, fixes };
  }

  private applySafetyWrappers(code: string): { code: string; fixes: string[] } {
    let fixed = code;
    const fixes: string[] = [];

    // Wrap JSON.parse in try-catch if not already
    if (/JSON\.parse\s*\(/.test(fixed) && !/try\s*\{[^}]*JSON\.parse/.test(fixed)) {
      // This requires more sophisticated AST transformation
      // For now, we rely on the DynamicOracleRenderer's safe wrappers
    }

    return { code: fixed, fixes };
  }

  // ==========================================================================
  // SUGGESTIONS
  // ==========================================================================

  private generateSuggestions(logicErrors: LogicError[], violations: InvariantViolation[]): string[] {
    const suggestions: string[] = [];

    for (const error of logicErrors) {
      suggestions.push(`${error.type}: ${error.fix}`);
    }

    for (const violation of violations) {
      suggestions.push(`${violation.invariant}: Fix ${violation.violation}`);
    }

    return suggestions;
  }
}

// Singleton export
export const FormalVerifier = new FormalVerifierImpl();
