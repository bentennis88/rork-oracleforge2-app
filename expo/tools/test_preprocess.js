#!/usr/bin/env node
/**
 * Test preprocessGeneratedCode logic to ensure firebase config is stripped,
 * not injected, and malformed appId patterns are handled.
 */

// Simulated preprocessGeneratedCode function (updated version)
function preprocessGeneratedCode(raw) {
  let out = raw;

  try {
    // Remove any firebaseConfig object literal (robust regex, non-greedy)
    out = out.replace(/const\s+firebaseConfig\s*=\s*\{[\s\S]*?\};?/g, '');
    out = out.replace(/(?:let|var)\s+firebaseConfig\s*=\s*\{[\s\S]*?\};?/g, '');

    // Remove ENTIRE lines containing firebase initialization (not just function calls)
    out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*initializeApp\s*\([^)]*\).*$/gm, '');
    out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*getDatabase\s*\([^)]*\).*$/gm, '');
    out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*getFirestore\s*\([^)]*\).*$/gm, '');
    out = out.replace(/^.*(?:const|let|var)\s+\w+\s*=\s*getAuth\s*\([^)]*\).*$/gm, '');
    out = out.replace(/^.*firebase\.initializeApp\s*\([^)]*\).*$/gm, '');

    // Remove standalone calls (without assignment)
    out = out.replace(/^\s*initializeApp\s*\([^)]*\)\s*;?\s*$/gm, '');
    out = out.replace(/^\s*getDatabase\s*\([^)]*\)\s*;?\s*$/gm, '');

    // Remove any stray appId-like broken tokens
    out = out.replace(/android:\s*['"][^'\"]*['"]/gi, '');
    out = out.replace(/appId\s*:\s*['"][^'\"]*['"],?/gi, '');
    out = out.replace(/ios:\s*['"][^'\"]*['"]/gi, '');
    
    // Remove malformed appId patterns
    out = out.replace(/:\s*"1:[^"]*android:[^"]*"/gi, ':""');
    out = out.replace(/:\s*'1:[^']*android:[^']*'/gi, ":''");

    // Remove common placeholders (replace with empty strings)
    out = out.replace(/YOUR_API_KEY/g, '""');
    out = out.replace(/YOUR_AUTH_DOMAIN/g, '""');
    out = out.replace(/YOUR_PROJECT_ID/g, '""');
    out = out.replace(/YOUR_DATABASE_URL/g, '""');
    out = out.replace(/YOUR_STORAGE_BUCKET/g, '""');
    out = out.replace(/YOUR_MESSAGING_SENDER_ID/g, '""');
    out = out.replace(/YOUR_APP_ID/g, '""');

    // Remove dangling variable declarations left after stripping
    out = out.replace(/^[\t ]*(?:const|let|var)\s+\w+\s*=\s*[\r\n]+/gm, '');
    out = out.replace(/^[\t ]*(?:const|let|var)\s+\w+\s*=\s*;/gm, '');

    // Clean up dangling commas after removals
    out = out.replace(/,\s*,/g, ',');
    out = out.replace(/\{\s*,/g, '{');
    out = out.replace(/,\s*\}/g, '}');
    out = out.replace(/,\s*\]/g, ']');

    // Clean up multiple consecutive blank lines
    out = out.replace(/\n{3,}/g, '\n\n');

  } catch (e) {
    console.warn('[Test] preprocessGeneratedCode failed:', e);
  }

  return out;
}

// Test cases
const tests = [
  {
    name: 'Remove firebaseConfig object',
    input: `const firebaseConfig = {
  apiKey: "test",
  appId: "1:206306883902:android:1878b63e74585e92abd46f"
};
const App = () => <View><Text>Hello</Text></View>;`,
    check: (out) => !out.includes('firebaseConfig') && out.includes('const App'),
  },
  {
    name: 'Remove malformed appId with embedded quote',
    input: `const config = {
  appId: "1:206306883902:android: "1878b63e74585e92abd46f",
  other: "value"
};`,
    check: (out) => !out.includes('android:') && !out.includes('1878'),
  },
  {
    name: 'Remove entire initializeApp line',
    input: `const app = initializeApp(firebaseConfig);
const App = () => <View />;`,
    check: (out) => !out.includes('initializeApp') && !out.includes('const app =') && out.includes('const App'),
  },
  {
    name: 'Remove entire getDatabase line',
    input: `const database = getDatabase(app);
const App = () => <View />;`,
    check: (out) => !out.includes('getDatabase') && !out.includes('const database') && out.includes('const App'),
  },
  {
    name: 'Replace YOUR_API_KEY with empty string',
    input: `const key = YOUR_API_KEY;`,
    check: (out) => !out.includes('YOUR_API_KEY') && out.includes('""'),
  },
  {
    name: 'Clean dangling commas',
    input: `const x = { a: 1, , b: 2 };`,
    check: (out) => !out.includes(', ,'),
  },
  {
    name: 'Remove dangling variable declaration',
    input: `const database = 
const App = () => <View />;`,
    check: (out) => !out.includes('const database =') && out.includes('const App'),
  },
  {
    name: 'Real-world firebase setup removal',
    input: `// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

const WaterIntakeReminder = () => {
  const [count, setCount] = useState(0);
  return <View><Text>{count}</Text></View>;
};

export default WaterIntakeReminder;`,
    check: (out) => {
      const noFirebaseConfig = !out.includes('const firebaseConfig');
      const noInitialize = !out.includes('initializeApp');
      const noGetDatabase = !out.includes('getDatabase');
      const noDanglingApp = !out.includes('const app =');
      const noDanglingDb = !out.includes('const database =');
      const hasComponent = out.includes('const WaterIntakeReminder');
      const hasExport = out.includes('export default');
      return noFirebaseConfig && noInitialize && noGetDatabase && noDanglingApp && noDanglingDb && hasComponent && hasExport;
    },
  },
];

console.log('Running preprocessGeneratedCode tests...\n');

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = preprocessGeneratedCode(test.input);
  const ok = test.check(result);
  
  if (ok) {
    console.log(`✓ ${test.name}`);
    passed++;
  } else {
    console.log(`✗ ${test.name}`);
    console.log('  Input:', test.input.slice(0, 150).replace(/\n/g, '\\n') + '...');
    console.log('  Output:', result.slice(0, 150).replace(/\n/g, '\\n') + '...');
    failed++;
  }
}

console.log(`\n${passed}/${tests.length} tests passed`);
process.exit(failed > 0 ? 1 : 0);
