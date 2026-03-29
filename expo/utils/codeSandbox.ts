// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React from "react";

const DANGEROUS_PATTERNS = [
  /\beval\s*\(/gi,
  /\bnew\s+Function\s*\(/gi,
  /\bexec\s*\(/gi,
  /\bspawn\s*\(/gi,
  /\bchild_process\b/gi,
  /\bfs\s*\.\s*(write|unlink|rm|mkdir|rmdir)/gi,
  /\bprocess\s*\.\s*(exit|kill)/gi,
  /\brequire\s*\(\s*['"`](?!react|react-native)/gi,
  /\b__dirname\b/gi,
  /\b__filename\b/gi,
  /\bwindow\s*\.\s*(open|close|location)/gi,
  /\bdocument\s*\.\s*(write|cookie)/gi,
  /\bXMLHttpRequest\b/gi,
  /\bWebSocket\b/gi,
  /\bServiceWorker\b/gi,
  /\bIndexedDB\b/gi,
];

export interface SandboxResult {
  isValid: boolean;
  sanitizedCode: string;
  errors: string[];
  warnings: string[];
}

export function validateOracleCode(code: string): SandboxResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let sanitizedCode = code;

  console.log('[Sandbox] Validating oracle code, length:', code.length);

  if (!code || code.trim().length < 20) {
    errors.push('Code is too short or empty');
    return { isValid: false, sanitizedCode: '', errors, warnings };
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(code)) {
      const match = code.match(pattern);
      warnings.push(`Pattern detected (may be safe): ${match?.[0] || pattern.source}`);
      console.log('[Sandbox] Pattern found:', pattern.source);
    }
  }

  sanitizedCode = sanitizedCode
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');

  const hasOracleComponent = /function\s+OracleComponent\s*\(/.test(sanitizedCode);
  if (!hasOracleComponent) {
    warnings.push('No OracleComponent function found');
  }

  const hasStyleSheet = /StyleSheet\.create/.test(code);
  if (!hasStyleSheet) {
    warnings.push('No StyleSheet.create found');
  }

  const isValid = errors.length === 0;
  
  console.log('[Sandbox] Validation result:', { isValid, errorCount: errors.length, warningCount: warnings.length });
  
  return {
    isValid,
    sanitizedCode: isValid ? sanitizedCode : '',
    errors,
    warnings,
  };
}

export function sanitizeForDisplay(code: string): string {
  return code
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function extractComponentName(code: string): string | null {
  const oracleMatch = code.match(/function\s+(OracleComponent)\s*\(/);
  if (oracleMatch) {
    return oracleMatch[1];
  }

  const defaultExportMatch = code.match(/export\s+default\s+(?:function\s+)?(\w+)/);
  if (defaultExportMatch) {
    return defaultExportMatch[1];
  }

  const functionMatch = code.match(/(?:function|const|class)\s+(\w+)/);
  if (functionMatch) {
    return functionMatch[1];
  }

  return null;
}

export function wrapInErrorBoundary(code: string): string {
  const componentName = extractComponentName(code) || 'OracleComponent';
  
  const errorBoundaryCode = `
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.log('[Oracle Error]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ padding: 20, backgroundColor: '#1a0a0a' }}>
          <Text style={{ color: '#FF3B5C', fontSize: 14 }}>
            Oracle Error: {this.state.error?.message || 'Unknown error'}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

function SafeOracleWrapper(props) {
  return (
    <ErrorBoundary>
      <${componentName} {...props} />
    </ErrorBoundary>
  );
}
`;
  
  return code + '\n' + errorBoundaryCode;
}

export const SANDBOX_TIMEOUT_MS = 5000;

export function createSafeExecutionContext() {
  return {
    View: null,
    Text: null,
    TouchableOpacity: null,
    TextInput: null,
    ScrollView: null,
    StyleSheet: null,
    useState: null,
    useEffect: null,
    useCallback: null,
    useMemo: null,
    Alert: {
      alert: (title: string, message: string) => {
        console.log(`[Alert] ${title}: ${message}`);
      },
    },
    Share: {
      share: async (options: { message: string }) => {
        console.log('[Share]', options.message);
        return { action: 'sharedAction' };
      },
    },
    console: {
      log: (...args: unknown[]) => console.log('[Oracle]', ...args),
      warn: (...args: unknown[]) => console.warn('[Oracle]', ...args),
      error: (...args: unknown[]) => console.error('[Oracle]', ...args),
    },
  };
}
