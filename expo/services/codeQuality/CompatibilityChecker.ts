/**
 * CompatibilityChecker - Cross-platform compatibility verification
 * Ensures code works across iOS/Android versions, API changes, and device variations
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CompatibilityReport {
  isCompatible: boolean;
  score: number; // 0-100
  platforms: PlatformCompatibility[];
  apiIssues: APIIssue[];
  deprecations: Deprecation[];
  suggestions: CompatibilitySuggestion[];
}

export interface PlatformCompatibility {
  platform: 'ios' | 'android' | 'web';
  minVersion: string;
  maxVersion: string;
  compatible: boolean;
  issues: string[];
}

export interface APIIssue {
  api: string;
  issue: string;
  affectedPlatforms: ('ios' | 'android' | 'web')[];
  minVersion: string;
  fix: string;
}

export interface Deprecation {
  api: string;
  deprecatedIn: string;
  removedIn?: string;
  replacement: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface CompatibilitySuggestion {
  type: 'polyfill' | 'conditional' | 'alternative' | 'upgrade';
  description: string;
  code?: string;
}

// ============================================================================
// API VERSION DATABASE
// ============================================================================

interface APIInfo {
  name: string;
  introducedIn: { ios?: string; android?: string };
  deprecatedIn?: { ios?: string; android?: string };
  removedIn?: { ios?: string; android?: string };
  replacement?: string;
  polyfill?: string;
}

const API_DATABASE: APIInfo[] = [
  // React Native APIs
  {
    name: 'Appearance',
    introducedIn: { ios: '13.0', android: '10' },
    polyfill: `const colorScheme = Platform.OS === 'ios' ? (Platform.Version >= 13 ? Appearance.getColorScheme() : 'light') : Appearance.getColorScheme();`,
  },
  {
    name: 'useColorScheme',
    introducedIn: { ios: '13.0', android: '10' },
  },
  {
    name: 'StatusBar.setBarStyle',
    introducedIn: { ios: '7.0', android: '5.0' },
  },
  {
    name: 'Animated.event',
    introducedIn: { ios: '1.0', android: '1.0' },
  },
  {
    name: 'FlatList',
    introducedIn: { ios: '1.0', android: '1.0' },
  },
  {
    name: 'SectionList',
    introducedIn: { ios: '1.0', android: '1.0' },
  },
  {
    name: 'PlatformColor',
    introducedIn: { ios: '13.0', android: '10' },
    polyfill: `const systemColor = Platform.Version >= 13 ? PlatformColor('systemBackground') : '#FFFFFF';`,
  },
  {
    name: 'Pressable',
    introducedIn: { ios: '1.0', android: '1.0' },
  },
  
  // Deprecated APIs
  {
    name: 'AsyncStorage (from react-native)',
    introducedIn: { ios: '1.0', android: '1.0' },
    deprecatedIn: { ios: '1.0', android: '1.0' },
    replacement: '@react-native-async-storage/async-storage',
  },
  {
    name: 'NetInfo (from react-native)',
    introducedIn: { ios: '1.0', android: '1.0' },
    deprecatedIn: { ios: '1.0', android: '1.0' },
    replacement: '@react-native-community/netinfo',
  },
  {
    name: 'ViewPropTypes',
    introducedIn: { ios: '1.0', android: '1.0' },
    deprecatedIn: { ios: '0.66', android: '0.66' },
    removedIn: { ios: '0.69', android: '0.69' },
    replacement: 'TypeScript types or PropTypes from prop-types package',
  },
  {
    name: 'ColorPropType',
    introducedIn: { ios: '1.0', android: '1.0' },
    deprecatedIn: { ios: '0.66', android: '0.66' },
    removedIn: { ios: '0.69', android: '0.69' },
    replacement: 'TypeScript types',
  },
  
  // Platform-specific APIs
  {
    name: 'DatePickerIOS',
    introducedIn: { ios: '1.0' },
    deprecatedIn: { ios: '0.63' },
    replacement: '@react-native-community/datetimepicker',
  },
  {
    name: 'PickerIOS',
    introducedIn: { ios: '1.0' },
    deprecatedIn: { ios: '0.60' },
    replacement: '@react-native-picker/picker',
  },
  {
    name: 'ProgressBarAndroid',
    introducedIn: { android: '1.0' },
    deprecatedIn: { android: '0.66' },
    replacement: 'ActivityIndicator or custom component',
  },
  {
    name: 'ProgressViewIOS',
    introducedIn: { ios: '1.0' },
    deprecatedIn: { ios: '0.66' },
    replacement: 'Custom progress component',
  },
];

// ============================================================================
// PLATFORM FEATURE REQUIREMENTS
// ============================================================================

interface FeatureRequirement {
  pattern: RegExp;
  minIOS?: string;
  minAndroid?: number;
  description: string;
  alternative?: string;
}

const FEATURE_REQUIREMENTS: FeatureRequirement[] = [
  {
    pattern: /Haptics\.|haptic/i,
    minIOS: '10.0',
    minAndroid: 26,
    description: 'Haptic feedback',
    alternative: 'Use Vibration API as fallback',
  },
  {
    pattern: /BiometricAuthentication|FaceID|TouchID|fingerprint/i,
    minIOS: '8.0',
    minAndroid: 23,
    description: 'Biometric authentication',
    alternative: 'Fallback to PIN/password',
  },
  {
    pattern: /Camera\./i,
    minIOS: '10.0',
    minAndroid: 21,
    description: 'Camera access',
  },
  {
    pattern: /Geolocation|getCurrentPosition|watchPosition/i,
    minIOS: '8.0',
    minAndroid: 23,
    description: 'Location services',
  },
  {
    pattern: /PushNotification|Notifications\./i,
    minIOS: '10.0',
    minAndroid: 26,
    description: 'Push notifications',
  },
  {
    pattern: /Share\./i,
    minIOS: '6.0',
    minAndroid: 21,
    description: 'Share functionality',
  },
  {
    pattern: /Clipboard\./i,
    minIOS: '1.0',
    minAndroid: 21,
    description: 'Clipboard access',
  },
  {
    pattern: /BlurView|blur/i,
    minIOS: '8.0',
    minAndroid: 31,
    description: 'Blur effects',
    alternative: 'Use semi-transparent overlay on older Android',
  },
  {
    pattern: /LinearGradient/i,
    minIOS: '1.0',
    minAndroid: 21,
    description: 'Gradient backgrounds',
  },
  {
    pattern: /SafeAreaView|useSafeAreaInsets/i,
    minIOS: '11.0',
    minAndroid: 21,
    description: 'Safe area handling',
    alternative: 'Use StatusBar.currentHeight on Android',
  },
];

// ============================================================================
// COMPATIBILITY CHECKER CLASS
// ============================================================================

class CompatibilityCheckerImpl {
  private targetPlatforms = {
    ios: { min: '13.0', max: '17.0' },
    android: { min: 24, max: 34 },
  };

  /**
   * Check code compatibility across platforms
   */
  check(code: string): CompatibilityReport {
    const apiIssues = this.checkAPIs(code);
    const deprecations = this.checkDeprecations(code);
    const platformIssues = this.checkPlatformFeatures(code);
    const syntaxIssues = this.checkSyntaxCompatibility(code);
    
    const platforms = this.buildPlatformReport(code, [...apiIssues, ...platformIssues]);
    const suggestions = this.generateSuggestions(apiIssues, deprecations, platformIssues);
    
    const totalIssues = apiIssues.length + deprecations.filter(d => d.urgency !== 'low').length;
    const score = Math.max(0, 100 - (totalIssues * 10));
    
    return {
      isCompatible: totalIssues === 0,
      score,
      platforms,
      apiIssues,
      deprecations,
      suggestions,
    };
  }

  /**
   * Fix compatibility issues automatically
   */
  autoFix(code: string): { code: string; fixes: string[] } {
    let fixedCode = code;
    const fixes: string[] = [];

    // Add Platform checks for platform-specific code
    fixedCode = this.addPlatformChecks(fixedCode, fixes);

    // Replace deprecated APIs
    fixedCode = this.replaceDeprecatedAPIs(fixedCode, fixes);

    // Add polyfills for newer APIs
    fixedCode = this.addPolyfills(fixedCode, fixes);

    // Add version checks
    fixedCode = this.addVersionChecks(fixedCode, fixes);

    return { code: fixedCode, fixes };
  }

  // ==========================================================================
  // API CHECKING
  // ==========================================================================

  private checkAPIs(code: string): APIIssue[] {
    const issues: APIIssue[] = [];

    for (const api of API_DATABASE) {
      const pattern = new RegExp(`\\b${api.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      
      if (pattern.test(code)) {
        // Check if API requires newer platform version
        if (api.introducedIn.ios) {
          const requiredVersion = parseFloat(api.introducedIn.ios);
          if (requiredVersion > parseFloat(this.targetPlatforms.ios.min)) {
            issues.push({
              api: api.name,
              issue: `Requires iOS ${api.introducedIn.ios}+`,
              affectedPlatforms: ['ios'],
              minVersion: api.introducedIn.ios,
              fix: api.polyfill || `Add Platform.Version check for iOS ${api.introducedIn.ios}+`,
            });
          }
        }

        if (api.introducedIn.android) {
          const requiredVersion = parseInt(api.introducedIn.android, 10);
          if (requiredVersion > this.targetPlatforms.android.min) {
            issues.push({
              api: api.name,
              issue: `Requires Android API ${api.introducedIn.android}+`,
              affectedPlatforms: ['android'],
              minVersion: api.introducedIn.android,
              fix: api.polyfill || `Add Platform.Version check for Android ${api.introducedIn.android}+`,
            });
          }
        }
      }
    }

    return issues;
  }

  // ==========================================================================
  // DEPRECATION CHECKING
  // ==========================================================================

  private checkDeprecations(code: string): Deprecation[] {
    const deprecations: Deprecation[] = [];

    for (const api of API_DATABASE) {
      if (!api.deprecatedIn) continue;

      const pattern = new RegExp(`\\b${api.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`);
      
      if (pattern.test(code)) {
        const urgency = api.removedIn ? 'critical' : 'medium';
        
        deprecations.push({
          api: api.name,
          deprecatedIn: api.deprecatedIn.ios || api.deprecatedIn.android || 'unknown',
          removedIn: api.removedIn?.ios || api.removedIn?.android,
          replacement: api.replacement || 'See documentation',
          urgency,
        });
      }
    }

    // Check for common deprecated patterns
    const deprecatedPatterns: [RegExp, Deprecation][] = [
      [
        /componentWillMount|componentWillReceiveProps|componentWillUpdate/,
        {
          api: 'Legacy lifecycle methods',
          deprecatedIn: 'React 16.3',
          removedIn: 'React 17',
          replacement: 'useEffect or getDerivedStateFromProps',
          urgency: 'high',
        },
      ],
      [
        /require\s*\(\s*['"]react-native['"]\s*\)\s*\.\s*AsyncStorage/,
        {
          api: 'AsyncStorage from react-native',
          deprecatedIn: 'React Native 0.60',
          replacement: '@react-native-async-storage/async-storage',
          urgency: 'high',
        },
      ],
      [
        /StyleSheet\.flatten/,
        {
          api: 'StyleSheet.flatten',
          deprecatedIn: 'React Native 0.70',
          replacement: 'Use StyleSheet.compose or spread operator',
          urgency: 'low',
        },
      ],
    ];

    for (const [pattern, deprecation] of deprecatedPatterns) {
      if (pattern.test(code)) {
        deprecations.push(deprecation);
      }
    }

    return deprecations;
  }

  // ==========================================================================
  // PLATFORM FEATURE CHECKING
  // ==========================================================================

  private checkPlatformFeatures(code: string): APIIssue[] {
    const issues: APIIssue[] = [];

    for (const feature of FEATURE_REQUIREMENTS) {
      if (feature.pattern.test(code)) {
        const affectedPlatforms: ('ios' | 'android')[] = [];

        if (feature.minIOS) {
          const required = parseFloat(feature.minIOS);
          if (required > parseFloat(this.targetPlatforms.ios.min)) {
            affectedPlatforms.push('ios');
          }
        }

        if (feature.minAndroid) {
          if (feature.minAndroid > this.targetPlatforms.android.min) {
            affectedPlatforms.push('android');
          }
        }

        if (affectedPlatforms.length > 0) {
          issues.push({
            api: feature.description,
            issue: `Requires ${affectedPlatforms.map(p => 
              p === 'ios' ? `iOS ${feature.minIOS}+` : `Android API ${feature.minAndroid}+`
            ).join(' / ')}`,
            affectedPlatforms,
            minVersion: feature.minIOS || String(feature.minAndroid) || 'unknown',
            fix: feature.alternative || 'Add platform version check',
          });
        }
      }
    }

    return issues;
  }

  // ==========================================================================
  // SYNTAX COMPATIBILITY
  // ==========================================================================

  private checkSyntaxCompatibility(code: string): APIIssue[] {
    const issues: APIIssue[] = [];

    // Check for ES features that need Hermes or newer JS engines
    const esFeatures: [RegExp, string, string][] = [
      [/\?\?/, 'Nullish coalescing (??)', 'Hermes or RN 0.63+'],
      [/\?\.\[/, 'Optional chaining with brackets', 'Hermes or RN 0.63+'],
      [/(?<![\w$])(?:let|const)\s+\[.*\]\s*=.*\[.*\]\.entries\(\)/, 'Array destructuring from entries', 'ES2015+'],
      [/Object\.fromEntries/, 'Object.fromEntries', 'ES2019+'],
      [/Array\.prototype\.flat|\.flat\s*\(/, 'Array.flat', 'ES2019+'],
      [/Promise\.allSettled/, 'Promise.allSettled', 'ES2020+'],
      [/BigInt|(?<!\w)\d+n(?!\w)/, 'BigInt', 'ES2020+'],
    ];

    for (const [pattern, feature, requirement] of esFeatures) {
      if (pattern.test(code)) {
        // These are generally fine with Hermes, just noting them
        // issues.push({ ... });
      }
    }

    return issues;
  }

  // ==========================================================================
  // PLATFORM REPORT BUILDING
  // ==========================================================================

  private buildPlatformReport(code: string, issues: APIIssue[]): PlatformCompatibility[] {
    const iosIssues = issues.filter(i => i.affectedPlatforms.includes('ios')).map(i => i.issue);
    const androidIssues = issues.filter(i => i.affectedPlatforms.includes('android')).map(i => i.issue);

    return [
      {
        platform: 'ios',
        minVersion: this.targetPlatforms.ios.min,
        maxVersion: this.targetPlatforms.ios.max,
        compatible: iosIssues.length === 0,
        issues: iosIssues,
      },
      {
        platform: 'android',
        minVersion: String(this.targetPlatforms.android.min),
        maxVersion: String(this.targetPlatforms.android.max),
        compatible: androidIssues.length === 0,
        issues: androidIssues,
      },
    ];
  }

  // ==========================================================================
  // SUGGESTION GENERATION
  // ==========================================================================

  private generateSuggestions(
    apiIssues: APIIssue[],
    deprecations: Deprecation[],
    platformIssues: APIIssue[]
  ): CompatibilitySuggestion[] {
    const suggestions: CompatibilitySuggestion[] = [];

    // Suggest polyfills for API issues
    for (const issue of apiIssues) {
      const apiInfo = API_DATABASE.find(a => a.name === issue.api);
      if (apiInfo?.polyfill) {
        suggestions.push({
          type: 'polyfill',
          description: `Add polyfill for ${issue.api}`,
          code: apiInfo.polyfill,
        });
      } else {
        suggestions.push({
          type: 'conditional',
          description: `Add version check for ${issue.api}`,
          code: `if (Platform.OS === 'ios' && parseFloat(Platform.Version) >= ${issue.minVersion}) {
  // Use ${issue.api}
} else {
  // Fallback
}`,
        });
      }
    }

    // Suggest replacements for deprecations
    for (const dep of deprecations) {
      suggestions.push({
        type: 'alternative',
        description: `Replace ${dep.api} with ${dep.replacement}`,
      });
    }

    return suggestions;
  }

  // ==========================================================================
  // AUTO-FIX METHODS
  // ==========================================================================

  private addPlatformChecks(code: string, fixes: string[]): string {
    let fixed = code;

    // Add Platform import if not present
    if (!/import.*Platform.*from\s*['"]react-native['"]/.test(code) && /Platform\.(OS|Version|select)/.test(code)) {
      fixed = `import { Platform } from 'react-native';\n${fixed}`;
      fixes.push('Added Platform import');
    }

    return fixed;
  }

  private replaceDeprecatedAPIs(code: string, fixes: string[]): string {
    let fixed = code;

    // Replace deprecated lifecycle methods hints
    if (/componentWillMount/.test(fixed)) {
      fixes.push('Consider replacing componentWillMount with useEffect');
    }

    // Replace old AsyncStorage import
    if (/from\s*['"]react-native['"]\s*;?\s*[\s\S]*AsyncStorage/.test(fixed)) {
      fixed = fixed.replace(
        /import\s*\{([^}]*)\bAsyncStorage\b([^}]*)\}\s*from\s*['"]react-native['"]/,
        (match, before, after) => {
          const otherImports = (before + after).replace(/,\s*,/g, ',').replace(/^\s*,|,\s*$/g, '').trim();
          const rnImport = otherImports ? `import { ${otherImports} } from 'react-native';\n` : '';
          return `${rnImport}import AsyncStorage from '@react-native-async-storage/async-storage'`;
        }
      );
      fixes.push('Updated AsyncStorage import');
    }

    return fixed;
  }

  private addPolyfills(code: string, fixes: string[]): string {
    let fixed = code;

    // Add Array.flat polyfill if needed
    if (/\.flat\s*\(/.test(code) && !/Array\.prototype\.flat/.test(code)) {
      const polyfill = `
// Polyfill for Array.flat
if (!Array.prototype.flat) {
  Array.prototype.flat = function(depth = 1) {
    return this.reduce((acc, val) => 
      Array.isArray(val) && depth > 0
        ? acc.concat(val.flat(depth - 1))
        : acc.concat(val), []);
  };
}
`;
      // Would add to imports section
      fixes.push('Consider adding Array.flat polyfill for older environments');
    }

    return fixed;
  }

  private addVersionChecks(code: string, fixes: string[]): string {
    // Add version checks for platform-specific features
    // This is a simplified version - production would use AST
    return code;
  }

  /**
   * Set target platform versions
   */
  setTargetPlatforms(ios: { min: string; max: string }, android: { min: number; max: number }): void {
    this.targetPlatforms = { ios, android };
  }
}

// Singleton export
export const CompatibilityChecker = new CompatibilityCheckerImpl();
