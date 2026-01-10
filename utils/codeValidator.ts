interface ValidationResult {
  code: string;
  issues: string[];
}

export function validateAndFixCode(code: string): ValidationResult {
  const issues: string[] = [];
  let fixed = code;

  if (!code.includes('import React')) {
    fixed = "import React, { useState, useEffect } from 'react';\n" + fixed;
    issues.push('Added missing React import');
  }

  if (!code.includes('export default')) {
    issues.push('WARNING: No default export found');
  }

  if (!code.includes('{ userId, oracleId, firebaseService }') && 
      !code.includes('props.userId') && 
      !code.includes('props.oracleId')) {
    issues.push('WARNING: Component may not receive required props');
  }

  fixed = fixed.replace(/localStorage\./g, 'AsyncStorage.');
  if (fixed !== code) {
    issues.push('Replaced localStorage with AsyncStorage');
    code = fixed;
  }

  if (code.includes('StyleSheet.create') && 
      !code.includes('StyleSheet') && 
      code.includes('import {')) {
    const importMatch = fixed.match(/import\s*{([^}]*)}\s*from\s*['"]react-native['"]/);
    if (importMatch) {
      const imports = importMatch[1];
      if (!imports.includes('StyleSheet')) {
        fixed = fixed.replace(
          /import\s*{([^}]*)}\s*from\s*['"]react-native['"]/,
          `import { StyleSheet,$1 } from 'react-native'`
        );
        issues.push('Added StyleSheet import');
      }
    }
  }

  if (code.includes('AsyncStorage') && !code.includes('@react-native-async-storage')) {
    const hasAsyncStorageImport = code.includes("from '@react-native-async-storage/async-storage'");
    if (!hasAsyncStorageImport) {
      fixed = "import AsyncStorage from '@react-native-async-storage/async-storage';\n" + fixed;
      issues.push('Added AsyncStorage import');
    }
  }

  return { code: fixed, issues };
}
