# Regression Analysis Report: Code Truncation Bug

## Executive Summary

A regression was identified where generated oracle code was being truncated mid-statement, causing Babel parse failures. The root cause was **corrupted cache data** that stored truncated API responses without validation.

## Error Signature

```
ERROR  [DynamicOracle] Error: Failed to parse generated code: /dynamic-oracle-parse.tsx: Unexpected token (3:0)

  1 | const SportsTimerApp = () => {
  2 |   const [currentView, setCurrentView] = useStat.
> 3 | }
    | ^
```

Note: `useStat.` is a truncated form of `useState`.

## Timeline of Events

| Time | Component | Event | Code Length |
|------|-----------|-------|-------------|
| T+0ms | API | Returns truncated response | 205 chars |
| T+1ms | Cache | Stores without validation | 205 chars |
| T+5000ms | Cache | Returns corrupted data on next request | 205 chars |
| T+5002ms | Babel | Parse failure | - |

## Root Cause Analysis

### Primary Cause
The `ResponseCache` class in `LocalModelFallback.ts` stored API responses without validating:
1. Minimum code length
2. Presence of required structures (`export default`)
3. Absence of truncation signatures

### Contributing Factors
1. **Low threshold check**: Code length > 100 passed (should be > 500)
2. **No corruption detection**: Truncation signatures like `useStat.` were not checked
3. **Cache persistence**: Corrupted data persisted in AsyncStorage across sessions

## Affected Files

| File | Lines | Issue |
|------|-------|-------|
| `services/sandbox/LocalModelFallback.ts` | 1021-1043 | Cache.get() returned corrupted data |
| `services/sandbox/LocalModelFallback.ts` | 1057-1076 | Cache.set() stored corrupted data |
| `services/sandbox/LocalModelFallback.ts` | 1230-1250 | infer() returned cached corruption |
| `services/oracleCodeGenerator.ts` | 388-397 | No API response validation |

## Minimal Reproducible Example

```typescript
// BUGGY CODE (Original)
class ResponseCache {
  set(key: string, value: string): void {
    // BUG: No validation - stores truncated code
    this.cache.set(key, value);
  }
  
  get(key: string): string | null {
    // BUG: Returns truncated code without validation
    return this.cache.get(key) || null;
  }
}

// Scenario:
// 1. API returns truncated: "const [x, setX] = useStat."
// 2. Cache stores it without validation
// 3. Next request returns corrupted code
// 4. Babel fails to parse
```

## Fix Applied

### 1. Cache Version Increment
```diff
- const CACHE_KEY = '@oracle_forge_inference_cache_v1';
+ const CACHE_KEY = '@oracle_forge_inference_cache_v2';
```
This invalidates all corrupted cache entries from previous sessions.

### 2. Cache Set Validation
```typescript
async set(input: string, output: string, model: string): Promise<void> {
  // NEW: Validate before storing
  if (!output || output.length < 500) {
    console.warn('[ResponseCache] Refusing to cache short output:', output?.length || 0);
    return;
  }
  if (!output.includes('export default')) {
    console.warn('[ResponseCache] Refusing to cache code without export default');
    return;
  }
  if (output.includes('useStat.') || output.includes('setS.') || output.endsWith('.')) {
    console.warn('[ResponseCache] Refusing to cache truncated code');
    return;
  }
  // ... proceed with caching
}
```

### 3. Cache Get Validation
```typescript
get(input: string): CachedResponse | null {
  const cached = this.cache.get(inputHash);
  
  if (cached) {
    // NEW: Validate on retrieval
    const output = cached.output;
    if (!output || output.length < 500) {
      console.warn('[ResponseCache] Cached entry too short, removing');
      this.cache.delete(inputHash);
      return null;
    }
    if (output.includes('useStat.') || !output.includes('export default')) {
      console.warn('[ResponseCache] Cached entry appears truncated, removing');
      this.cache.delete(inputHash);
      return null;
    }
    // ... return valid cache
  }
}
```

### 4. API Response Validation
```typescript
// In callGrokAPI()
const code = data.choices?.[0]?.message?.content || '';

// NEW: Reject truncated responses
if (code.length < 500) {
  throw new Error(`API returned truncated response (${code.length} chars)`);
}
if (!code.includes('export default') && !code.includes('function')) {
  throw new Error('API response appears incomplete');
}
```

## Truncation Signatures

The following patterns indicate truncated code:

| Pattern | Full Form |
|---------|-----------|
| `useStat.` | `useState` |
| `useEff.` | `useEffect` |
| `setS.` | `setState` / setter functions |
| `AsyncSto.` | `AsyncStorage` |
| `StyleShe.` | `StyleSheet` |
| `TouchableO.` | `TouchableOpacity` |

## Verification

Run the debug tool to verify the fix:

```bash
npx ts-node tools/debugCodePipeline.ts
```

Expected output:
- Failure simulation shows corruption detected at `Cache::set`
- Fixed simulation shows corruption rejected, valid code cached

## Prevention Measures

1. **Validation at boundaries**: Always validate data when entering/exiting cache
2. **Minimum length thresholds**: Require 500+ chars for valid generated code
3. **Structure validation**: Require `export default` in all generated components
4. **Truncation detection**: Check for known truncation signatures
5. **Cache versioning**: Increment version when validation rules change
