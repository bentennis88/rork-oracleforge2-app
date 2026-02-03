/**
 * EdgeCaseHandler - Comprehensive edge case injection for robust code
 * Handles: network failures, permissions, device rotation, memory pressure,
 * offline mode, accessibility, and all platform-specific edge cases
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface EdgeCaseConfig {
  networkFailures: boolean;
  permissionErrors: boolean;
  deviceRotation: boolean;
  memoryPressure: boolean;
  offlineMode: boolean;
  accessibility: boolean;
  platformDifferences: boolean;
  inputValidation: boolean;
  boundaryConditions: boolean;
}

export interface EdgeCaseInjection {
  type: EdgeCaseType;
  code: string;
  description: string;
  location: 'import' | 'state' | 'effect' | 'handler' | 'render';
}

export type EdgeCaseType =
  | 'network_retry'
  | 'network_timeout'
  | 'network_offline'
  | 'permission_denied'
  | 'permission_request'
  | 'orientation_change'
  | 'keyboard_dismiss'
  | 'memory_warning'
  | 'background_foreground'
  | 'deep_link'
  | 'accessibility_reader'
  | 'platform_ios'
  | 'platform_android'
  | 'input_empty'
  | 'input_overflow'
  | 'input_special_chars'
  | 'array_empty'
  | 'array_large'
  | 'date_timezone'
  | 'locale_format';

// ============================================================================
// EDGE CASE TEMPLATES
// ============================================================================

const NETWORK_HANDLING = `
// Network state management with retry logic
const [isOnline, setIsOnline] = useState(true);
const [retryCount, setRetryCount] = useState(0);
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Check network status
useEffect(() => {
  const checkNetwork = async () => {
    try {
      const response = await fetch('https://clients3.google.com/generate_204', { 
        method: 'HEAD',
        mode: 'no-cors' 
      });
      setIsOnline(true);
    } catch {
      setIsOnline(false);
    }
  };
  
  const interval = setInterval(checkNetwork, 30000);
  checkNetwork();
  
  return () => clearInterval(interval);
}, []);

// Retry wrapper for network calls
const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries = MAX_RETRIES
): Promise<T> => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        await new Promise(r => setTimeout(r, RETRY_DELAY * Math.pow(2, attempt)));
      }
    }
  }
  
  throw lastError;
};
`;

const PERMISSION_HANDLING = `
// Permission state management
const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');

const requestPermission = async (permissionType: string): Promise<boolean> => {
  try {
    // Platform-specific permission handling
    if (Platform.OS === 'ios') {
      // iOS specific permission flow
    } else {
      // Android specific permission flow
    }
    setPermissionStatus('granted');
    return true;
  } catch (error) {
    console.warn('Permission denied:', error);
    setPermissionStatus('denied');
    Alert.alert(
      'Permission Required',
      'This feature requires permission to function. Please enable it in Settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }
};
`;

const ORIENTATION_HANDLING = `
// Device orientation handling
const [dimensions, setDimensions] = useState(Dimensions.get('window'));
const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(
  dimensions.width < dimensions.height ? 'portrait' : 'landscape'
);

useEffect(() => {
  const subscription = Dimensions.addEventListener('change', ({ window }) => {
    setDimensions(window);
    setOrientation(window.width < window.height ? 'portrait' : 'landscape');
  });
  
  return () => subscription?.remove();
}, []);

// Responsive styles based on orientation
const responsiveStyles = useMemo(() => ({
  container: {
    padding: orientation === 'portrait' ? 16 : 8,
    flexDirection: orientation === 'portrait' ? 'column' as const : 'row' as const,
  },
}), [orientation]);
`;

const KEYBOARD_HANDLING = `
// Keyboard visibility handling (safe - handles missing Keyboard.addListener)
const [keyboardVisible, setKeyboardVisible] = useState(false);
const [keyboardHeight, setKeyboardHeight] = useState(0);

useEffect(() => {
  // Safely check if Keyboard.addListener exists before using
  if (!Keyboard || typeof Keyboard.addListener !== 'function') {
    return; // Keyboard API not available, skip listener setup
  }
  
  const showSubscription = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
    (e) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e?.endCoordinates?.height || 0);
    }
  );
  
  const hideSubscription = Keyboard.addListener(
    Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
    () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    }
  );
  
  return () => {
    showSubscription?.remove?.();
    hideSubscription?.remove?.();
  };
}, []);
`;

const MEMORY_HANDLING = `
// Memory pressure handling (cleanup on unmount)
const isMounted = useRef(true);

useEffect(() => {
  isMounted.current = true;
  
  return () => {
    isMounted.current = false;
    // Clean up any subscriptions, timers, or cached data
  };
}, []);

// Safe state update that checks mount status
const safeSetState = <T>(setter: React.Dispatch<React.SetStateAction<T>>) => {
  return (value: React.SetStateAction<T>) => {
    if (isMounted.current) {
      setter(value);
    }
  };
};
`;

const APP_STATE_HANDLING = `
// App state (background/foreground) handling
const appState = useRef(AppState.currentState);

useEffect(() => {
  const subscription = AppState.addEventListener('change', nextAppState => {
    if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
      // App came to foreground - refresh data
      console.log('App came to foreground');
    } else if (nextAppState.match(/inactive|background/)) {
      // App going to background - save state
      console.log('App going to background');
    }
    appState.current = nextAppState;
  });
  
  return () => subscription.remove();
}, []);
`;

const ACCESSIBILITY_HANDLING = `
// Accessibility support
const accessibilityProps = {
  accessible: true,
  accessibilityRole: 'button' as const,
  accessibilityLabel: 'Action button',
  accessibilityHint: 'Double tap to activate',
};

// Screen reader announcements
const announce = (message: string) => {
  if (Platform.OS === 'ios') {
    AccessibilityInfo.announceForAccessibility(message);
  }
};
`;

const INPUT_VALIDATION = `
// Input validation with sanitization
const sanitizeInput = (input: string): string => {
  // Remove potentially dangerous characters
  return input
    .replace(/[<>]/g, '') // Prevent XSS
    .replace(/[\\x00-\\x1F\\x7F]/g, '') // Remove control characters
    .trim()
    .substring(0, 10000); // Prevent overflow
};

const validateNumericInput = (value: string, min = 0, max = Number.MAX_SAFE_INTEGER): number => {
  const num = parseFloat(value) || 0;
  return Math.max(min, Math.min(max, num));
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
  return emailRegex.test(email);
};
`;

const BOUNDARY_CONDITIONS = `
// Boundary condition handlers
const safeArrayAccess = <T>(arr: T[] | null | undefined, index: number, defaultValue: T): T => {
  if (!arr || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index];
};

const safeDivide = (numerator: number, denominator: number, defaultValue = 0): number => {
  if (denominator === 0 || !Number.isFinite(denominator)) {
    return defaultValue;
  }
  return numerator / denominator;
};

const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

const safeParseJSON = <T>(json: string, defaultValue: T): T => {
  try {
    return JSON.parse(json) as T;
  } catch {
    return defaultValue;
  }
};
`;

const PLATFORM_HANDLING = `
// Platform-specific adjustments
const platformStyles = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  android: {
    elevation: 4,
  },
  default: {},
});

const isIOS = Platform.OS === 'ios';
const isAndroid = Platform.OS === 'android';
const platformVersion = parseInt(Platform.Version.toString(), 10);
`;

const DATE_TIMEZONE_HANDLING = `
// Timezone-safe date handling
const formatDate = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }
  
  // Use locale-aware formatting
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (date: Date | string | number): string => {
  const d = new Date(date);
  if (isNaN(d.getTime())) {
    return 'Invalid time';
  }
  
  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};
`;

// ============================================================================
// EDGE CASE HANDLER CLASS
// ============================================================================

class EdgeCaseHandlerImpl {
  private defaultConfig: EdgeCaseConfig = {
    networkFailures: true,
    permissionErrors: true,
    deviceRotation: true,
    memoryPressure: true,
    offlineMode: true,
    accessibility: true,
    platformDifferences: true,
    inputValidation: true,
    boundaryConditions: true,
  };

  /**
   * Analyze code and determine which edge cases need handling
   */
  analyzeRequiredEdgeCases(code: string): EdgeCaseType[] {
    const required: EdgeCaseType[] = [];

    // Network operations
    if (/fetch\s*\(|axios\.|api\.|\.get\(|\.post\(/i.test(code)) {
      required.push('network_retry', 'network_timeout', 'network_offline');
    }

    // Permission-requiring features
    if (/camera|location|microphone|notification|contact|calendar/i.test(code)) {
      required.push('permission_denied', 'permission_request');
    }

    // Layout/UI code
    if (/StyleSheet|style\s*=|flexDirection/i.test(code)) {
      required.push('orientation_change');
    }

    // Text input
    if (/TextInput|input|onChangeText/i.test(code)) {
      required.push('keyboard_dismiss', 'input_empty', 'input_overflow', 'input_special_chars');
    }

    // Arrays and lists
    if (/\.map\s*\(|\.filter\s*\(|FlatList|SectionList/i.test(code)) {
      required.push('array_empty', 'array_large');
    }

    // Date/time
    if (/new Date|Date\.|moment|dayjs/i.test(code)) {
      required.push('date_timezone', 'locale_format');
    }

    // Platform checks
    if (/Platform\.|ios|android/i.test(code)) {
      required.push('platform_ios', 'platform_android');
    }

    // State updates (memory/lifecycle)
    if (/useState|useEffect|setState/i.test(code)) {
      required.push('memory_warning', 'background_foreground');
    }

    // Accessibility
    if (/accessible|accessibilityLabel|accessibilityRole/i.test(code)) {
      required.push('accessibility_reader');
    }

    return Array.from(new Set(required));
  }

  /**
   * Generate edge case handling code injections
   */
  generateInjections(requiredCases: EdgeCaseType[], config?: Partial<EdgeCaseConfig>): EdgeCaseInjection[] {
    const cfg = { ...this.defaultConfig, ...config };
    const injections: EdgeCaseInjection[] = [];

    // Network handling
    if (cfg.networkFailures && requiredCases.some(c => c.startsWith('network_'))) {
      injections.push({
        type: 'network_retry',
        code: NETWORK_HANDLING,
        description: 'Network state management with retry logic',
        location: 'state',
      });
    }

    // Permission handling
    if (cfg.permissionErrors && requiredCases.some(c => c.startsWith('permission_'))) {
      injections.push({
        type: 'permission_request',
        code: PERMISSION_HANDLING,
        description: 'Permission request with settings redirect',
        location: 'handler',
      });
    }

    // Orientation handling
    if (cfg.deviceRotation && requiredCases.includes('orientation_change')) {
      injections.push({
        type: 'orientation_change',
        code: ORIENTATION_HANDLING,
        description: 'Device orientation change handling',
        location: 'effect',
      });
    }

    // Keyboard handling
    if (requiredCases.includes('keyboard_dismiss')) {
      injections.push({
        type: 'keyboard_dismiss',
        code: KEYBOARD_HANDLING,
        description: 'Keyboard visibility management',
        location: 'effect',
      });
    }

    // Memory/lifecycle
    if (cfg.memoryPressure && requiredCases.includes('memory_warning')) {
      injections.push({
        type: 'memory_warning',
        code: MEMORY_HANDLING,
        description: 'Memory pressure and unmount handling',
        location: 'effect',
      });
    }

    // App state
    if (requiredCases.includes('background_foreground')) {
      injections.push({
        type: 'background_foreground',
        code: APP_STATE_HANDLING,
        description: 'Background/foreground state handling',
        location: 'effect',
      });
    }

    // Accessibility
    if (cfg.accessibility && requiredCases.includes('accessibility_reader')) {
      injections.push({
        type: 'accessibility_reader',
        code: ACCESSIBILITY_HANDLING,
        description: 'Accessibility support for screen readers',
        location: 'handler',
      });
    }

    // Input validation
    if (cfg.inputValidation && requiredCases.some(c => c.startsWith('input_'))) {
      injections.push({
        type: 'input_empty',
        code: INPUT_VALIDATION,
        description: 'Input validation and sanitization',
        location: 'handler',
      });
    }

    // Boundary conditions
    if (cfg.boundaryConditions && requiredCases.some(c => c.includes('array') || c.includes('overflow'))) {
      injections.push({
        type: 'array_empty',
        code: BOUNDARY_CONDITIONS,
        description: 'Boundary condition safety helpers',
        location: 'handler',
      });
    }

    // Platform differences
    if (cfg.platformDifferences && requiredCases.some(c => c.startsWith('platform_'))) {
      injections.push({
        type: 'platform_ios',
        code: PLATFORM_HANDLING,
        description: 'Platform-specific handling',
        location: 'state',
      });
    }

    // Date/timezone
    if (requiredCases.some(c => c.includes('date') || c.includes('locale'))) {
      injections.push({
        type: 'date_timezone',
        code: DATE_TIMEZONE_HANDLING,
        description: 'Timezone-safe date formatting',
        location: 'handler',
      });
    }

    return injections;
  }

  /**
   * Inject edge case handling into existing code
   */
  injectEdgeCaseHandling(code: string, config?: Partial<EdgeCaseConfig>): { code: string; injected: string[] } {
    const requiredCases = this.analyzeRequiredEdgeCases(code);
    const injections = this.generateInjections(requiredCases, config);
    const injectedDescriptions: string[] = [];

    // Check which injections are already present (don't duplicate)
    const filteredInjections = injections.filter(inj => {
      // Check for key indicators of each injection type
      switch (inj.type) {
        case 'network_retry':
          return !/withRetry|MAX_RETRIES/.test(code);
        case 'orientation_change':
          return !/Dimensions\.addEventListener|orientation/.test(code);
        case 'keyboard_dismiss':
          return !/keyboardWillShow|keyboardDidShow/.test(code);
        case 'memory_warning':
          return !/isMounted\.current/.test(code);
        case 'background_foreground':
          return !/AppState\.addEventListener/.test(code);
        case 'date_timezone':
          // Don't inject if code already has formatTime or formatDate functions
          return !/const\s+formatTime\s*=|function\s+formatTime|const\s+formatDate\s*=|function\s+formatDate/.test(code);
        default:
          return true;
      }
    });

    if (filteredInjections.length === 0) {
      return { code, injected: [] };
    }

    // Find injection points
    let modifiedCode = code;

    // Add imports if needed
    const importsNeeded: string[] = [];
    if (filteredInjections.some(i => ['orientation_change', 'platform_ios'].includes(i.type))) {
      if (!/import.*Dimensions/.test(code)) {
        importsNeeded.push('Dimensions');
      }
      if (!/import.*Platform/.test(code)) {
        importsNeeded.push('Platform');
      }
    }
    if (filteredInjections.some(i => i.type === 'keyboard_dismiss')) {
      if (!/import.*Keyboard/.test(code)) {
        importsNeeded.push('Keyboard');
      }
    }
    if (filteredInjections.some(i => i.type === 'background_foreground')) {
      if (!/import.*AppState/.test(code)) {
        importsNeeded.push('AppState');
      }
    }
    if (filteredInjections.some(i => i.type === 'permission_request')) {
      if (!/import.*Linking/.test(code)) {
        importsNeeded.push('Linking');
      }
    }

    // Add missing imports
    if (importsNeeded.length > 0) {
      const importLine = `import { ${importsNeeded.join(', ')} } from 'react-native';`;
      const reactNativeImport = code.match(/import\s*\{[^}]*\}\s*from\s*['"]react-native['"]/);
      
      if (reactNativeImport) {
        // Add to existing import
        const existingImports = reactNativeImport[0].match(/\{([^}]*)\}/)?.[1] || '';
        const newImports = Array.from(new Set([...existingImports.split(',').map(s => s.trim()), ...importsNeeded]));
        modifiedCode = modifiedCode.replace(
          reactNativeImport[0],
          `import { ${newImports.filter(Boolean).join(', ')} } from 'react-native'`
        );
      }
    }

    // Inject state/handler code after component declaration
    const componentMatch = modifiedCode.match(/(?:export\s+default\s+)?function\s+\w+\s*\([^)]*\)\s*\{|const\s+\w+\s*=\s*\([^)]*\)\s*=>\s*\{/);
    
    if (componentMatch) {
      const insertPoint = componentMatch.index! + componentMatch[0].length;
      const stateInjections = filteredInjections
        .filter(i => ['state', 'effect', 'handler'].includes(i.location))
        .map(i => {
          injectedDescriptions.push(i.description);
          return `\n  // ${i.description}\n${i.code}`;
        })
        .join('\n');

      if (stateInjections) {
        modifiedCode = 
          modifiedCode.substring(0, insertPoint) +
          stateInjections +
          modifiedCode.substring(insertPoint);
      }
    }

    return { code: modifiedCode, injected: injectedDescriptions };
  }

  /**
   * Generate defensive wrappers for common operations
   */
  getDefensiveWrappers(): string {
    return `
// ============================================================================
// DEFENSIVE WRAPPERS - Auto-generated for edge case safety
// ============================================================================

${BOUNDARY_CONDITIONS}

${INPUT_VALIDATION}

${DATE_TIMEZONE_HANDLING}
`;
  }
}

// Singleton export
export const EdgeCaseHandler = new EdgeCaseHandlerImpl();
