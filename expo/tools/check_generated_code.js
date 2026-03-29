#!/usr/bin/env node
// Quick validator for generated oracle code (preprocess + AST sanitize)
const fs = require('fs');
const path = require('path');
const Babel = require('@babel/standalone');

function trimToFirstComponent(src) {
  const patterns = [
    /export\s+default/,
    /export\s+const\s+\w+/,
    /export\s+function\s+\w+/,
    /const\s+\w+\s*=\s*\(?\s*.*?=>/,
    /function\s+\w+\s*\(/,
    /class\s+\w+\s+extends\s+/,
    /const\s+\w+\s*=\s*\(/,
  ];
  let firstIndex = -1;
  for (const pat of patterns) {
    const m = src.search(pat);
    if (m !== -1 && (firstIndex === -1 || m < firstIndex)) firstIndex = m;
  }
  if (firstIndex <= 0) return { trimmed: src, removed: '' };
  return { trimmed: src.slice(firstIndex), removed: src.slice(0, firstIndex) };
}

function simpleAutoFix(s) {
  try {
    s = s.replace(/:\s*([A-Za-z0-9_$]+)'/g, ": '$1'");
    s = s.replace(/:\s*([A-Za-z0-9_$]+)\"/g, ': "$1"');
    const lines = s.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const singleQuotes = (line.match(/'/g) || []).length;
      const doubleQuotes = (line.match(/"/g) || []).length;
      if (singleQuotes % 2 === 1 && doubleQuotes % 2 === 0) {
        if (/:\s*[A-Za-z0-9_$\s]+$/.test(line)) lines[i] = line + "'";
      }
      if (doubleQuotes % 2 === 1 && singleQuotes % 2 === 0) {
        if (/:\s*[A-Za-z0-9_$\s]+$/.test(line)) lines[i] = line + '"';
      }
    }
    return lines.join('\n');
  } catch (e) {
    return s;
  }
}

function astSanitize(src) {
  let res;
  try {
    res = Babel.transform(src, { ast: true, code: false, presets: ['react', 'typescript'], filename: 'generated.tsx', sourceType: 'module' });
  } catch (e) {
    throw new Error('Parse failed: ' + e.message);
  }
  const ast = res && res.ast;
  if (!ast) throw new Error('No AST');
  const issues = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'eval') issues.push('eval');
    if (node.type === 'NewExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'Function') issues.push('Function');
    if (node.type === 'CallExpression' && node.callee && node.callee.type === 'Identifier' && node.callee.name === 'require') issues.push('require');
    for (const k of Object.keys(node)) {
      const child = node[k];
      if (Array.isArray(child)) child.forEach(walk);
      else if (child && typeof child === 'object' && child.type) walk(child);
    }
  };
  walk(ast);
  if (issues.length) throw new Error('AST issues: ' + issues.join(', '));
  return true;
}

async function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('Usage: validate-oracle <file.js|file.ts|->');
    process.exit(2);
  }
  let src = '';
  if (arg === '-') {
    src = fs.readFileSync(0, 'utf8');
  } else {
    const resolved = path.resolve(arg);
    if (!fs.existsSync(resolved)) {
      console.error(`File not found: ${resolved}`);
      console.error('Usage examples:');
      console.error('  npm run validate:oracle path/to/generated.tsx');
      console.error('  cat generated.tsx | npm run validate:oracle -');
      process.exit(2);
    }
    src = fs.readFileSync(resolved, 'utf8');
  }

  const { trimmed, removed } = trimToFirstComponent(src);
  const fixed = simpleAutoFix(trimmed);
  try {
    astSanitize(fixed);
    console.log('OK');
    process.exit(0);
  } catch (e) {
    console.error('Validation failed:', e.message);
    if (removed) console.error('Removed top snippet preview:\n', removed.slice(0, 400));
    process.exit(3);
  }
}

main();
