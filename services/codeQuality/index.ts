/**
 * Code Quality System - Barrel Export
 * 
 * Provides comprehensive code quality assurance:
 * 1. Formal verification with mathematical proofs
 * 2. Edge case handling for all scenarios
 * 3. Automatic test generation with 100% coverage
 * 4. Cross-platform compatibility checking
 */

export { FormalVerifier } from './FormalVerifier';
export type {
  VerificationResult,
  SyntaxError,
  LogicError,
  LogicErrorType,
  TypeError,
  InvariantViolation,
  Proof,
} from './FormalVerifier';

export { EdgeCaseHandler } from './EdgeCaseHandler';
export type {
  EdgeCaseConfig,
  EdgeCaseInjection,
  EdgeCaseType,
} from './EdgeCaseHandler';

export { TestGenerator } from './TestGenerator';
export type {
  TestSuite,
  TestCase,
  CoverageReport,
} from './TestGenerator';

export { CompatibilityChecker } from './CompatibilityChecker';
export type {
  CompatibilityReport,
  PlatformCompatibility,
  APIIssue,
  Deprecation,
  CompatibilitySuggestion,
} from './CompatibilityChecker';

/**
 * Combined quality assurance pipeline
 */
export interface QualityAssuranceResult {
  verification: import('./FormalVerifier').VerificationResult;
  compatibility: import('./CompatibilityChecker').CompatibilityReport;
  testSuite: import('./TestGenerator').TestSuite;
  edgeCasesInjected: string[];
  overallScore: number;
  passed: boolean;
  autoFixedCode?: string;
  fixes?: string[];
}

/**
 * Run complete quality assurance pipeline on code
 */
export async function runQualityAssurance(
  code: string,
  options: {
    autoFix?: boolean;
    injectEdgeCases?: boolean;
    generateTests?: boolean;
  } = {}
): Promise<QualityAssuranceResult> {
  const { FormalVerifier } = await import('./FormalVerifier');
  const { CompatibilityChecker } = await import('./CompatibilityChecker');
  const { TestGenerator } = await import('./TestGenerator');
  const { EdgeCaseHandler } = await import('./EdgeCaseHandler');

  let processedCode = code;
  const allFixes: string[] = [];

  // Step 1: Formal verification
  const verification = FormalVerifier.verify(processedCode);

  // Step 2: Auto-fix if enabled
  if (options.autoFix && !verification.isValid) {
    const fixed = FormalVerifier.autoFix(processedCode);
    processedCode = fixed.code;
    allFixes.push(...fixed.fixesApplied);
  }

  // Step 3: Compatibility check
  const compatibility = CompatibilityChecker.check(processedCode);

  // Step 4: Auto-fix compatibility issues
  if (options.autoFix && !compatibility.isCompatible) {
    const fixed = CompatibilityChecker.autoFix(processedCode);
    processedCode = fixed.code;
    allFixes.push(...fixed.fixes);
  }

  // Step 5: Inject edge case handling
  let edgeCasesInjected: string[] = [];
  if (options.injectEdgeCases) {
    const injected = EdgeCaseHandler.injectEdgeCaseHandling(processedCode);
    processedCode = injected.code;
    edgeCasesInjected = injected.injected;
  }

  // Step 6: Generate tests
  const testSuite = options.generateTests
    ? TestGenerator.generateTestSuite(processedCode)
    : {
        componentName: 'Unknown',
        imports: '',
        unitTests: [],
        integrationTests: [],
        snapshotTests: [],
        edgeCaseTests: [],
        coverageReport: {
          statements: 0,
          branches: 0,
          functions: 0,
          lines: 0,
          uncoveredPaths: [],
          coverageComplete: false,
        },
      };

  // Calculate overall score
  const verificationScore = verification.score;
  const compatibilityScore = compatibility.score;
  const coverageScore = testSuite.coverageReport.coverageComplete ? 100 : 
    (testSuite.coverageReport.statements + testSuite.coverageReport.branches + 
     testSuite.coverageReport.functions) / 3;

  const overallScore = Math.round(
    (verificationScore * 0.4) + (compatibilityScore * 0.3) + (coverageScore * 0.3)
  );

  const passed = verification.isValid && 
                 compatibility.isCompatible && 
                 testSuite.coverageReport.coverageComplete;

  return {
    verification,
    compatibility,
    testSuite,
    edgeCasesInjected,
    overallScore,
    passed,
    autoFixedCode: options.autoFix ? processedCode : undefined,
    fixes: allFixes.length > 0 ? allFixes : undefined,
  };
}
