import * as Babel from '@babel/standalone';
import { InteractionManager } from 'react-native';

type TransformOptions = Babel.TransformOptions | undefined;

// Worker-backed transpiler using `react-native-threads` when available.
let thread: any = null;
let threadAvailable = false;
let pendingRequests: Map<number, { resolve: (s: string) => void; reject: (e: any) => void }> = new Map();
let nextId = 1;

// Deduplicate concurrent requests for the same source to avoid repeated work
const inFlightByCode: Map<string, Promise<string>> = new Map();

// Simple concurrency queue for non-worker transforms
const transformQueue: Array<() => void> = [];
let running = 0;
const MAX_CONCURRENT = 1; // keep concurrency low to avoid blocking

function scheduleWork(cb: () => void) {
  if (typeof (InteractionManager as any)?.runAfterInteractions === 'function') {
    InteractionManager.runAfterInteractions(() => {
      try { cb(); } catch (e) { cb(); }
    });
    return;
  }

  if (typeof (global as any).requestIdleCallback === 'function') {
    (global as any).requestIdleCallback(() => {
      try { cb(); } catch (e) { cb(); }
    });
    return;
  }

  // fallback
  setTimeout(() => {
    try { cb(); } catch (e) { cb(); }
  }, 0);
}

function initThreadIfPossible() {
  if (threadAvailable || thread) return;
  try {
    // require dynamically so app doesn't crash if dep isn't installed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { Thread } = require('react-native-threads');
    // worker path is relative to project root in most setups
    thread = new Thread('components/transpileWorker.js');
    thread.onmessage = (msg: any) => {
      try {
        const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
        const id = data && data.id;
        if (!id) return;
        const entry = pendingRequests.get(id);
        if (!entry) return;
        pendingRequests.delete(id);
        if (data.error) entry.reject(new Error(data.error));
        else entry.resolve(data.code);
      } catch (e) {
        // ignore
      }
    };
    thread.onerror = (err: any) => {
      // fall back on scheduleWork
      threadAvailable = false;
      thread = null;
    };
    threadAvailable = true;
  } catch (e) {
    threadAvailable = false;
    thread = null;
  }
}

export function transpileAsync(code: string, options?: TransformOptions): Promise<string> {
  // dedupe concurrent requests for identical source
  if (inFlightByCode.has(code)) return inFlightByCode.get(code)!;

  const p = new Promise<string>((resolve, reject) => {
    initThreadIfPossible();
    if (threadAvailable && thread) {
      const id = nextId++;
      pendingRequests.set(id, { resolve, reject });
      try {
        thread.postMessage(JSON.stringify({ id, code, options }));
      } catch (err) {
        pendingRequests.delete(id);
        // fall back to queued immediate transform
        enqueueTransform(() => runTransformImmediate(code, options, resolve, reject));
      }

      // safety timeout for worker response
      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          reject(new Error('Transpile worker timed out'));
        }
      }, 30000);

      return;
    }

    // Fallback: schedule via concurrency-limited queue
    enqueueTransform(() => runTransformIdle(code, options, resolve, reject));
  });

  inFlightByCode.set(code, p);
  p.finally(() => inFlightByCode.delete(code));
  return p;
}

export default transpileAsync;

function enqueueTransform(task: () => void) {
  transformQueue.push(task);
  processQueue();
}

function processQueue() {
  if (running >= MAX_CONCURRENT) return;
  const task = transformQueue.shift();
  if (!task) return;
  running += 1;
  try {
    task();
  } finally {
    running -= 1;
    // schedule next tick to avoid deep recursion
    setTimeout(processQueue, 0);
  }
}

function runTransformIdle(code: string, options: TransformOptions | undefined, resolve: (s: string) => void, reject: (e: any) => void) {
  // use scheduleWork but guard with a timeout
  let settled = false;
  const timer = setTimeout(() => {
    if (settled) return;
    settled = true;
    reject(new Error('Transpile idle transform timed out'));
  }, 20000);

  scheduleWork(() => {
    if (settled) return;
    try {
      const res = Babel.transform(code, options as any);
      if (!res || !res.code) throw new Error('Transpilation returned empty result');
      settled = true;
      clearTimeout(timer);
      resolve(res.code as string);
    } catch (e) {
      settled = true;
      clearTimeout(timer);
      reject(e);
    }
  });
}

function runTransformImmediate(code: string, options: TransformOptions | undefined, resolve: (s: string) => void, reject: (e: any) => void) {
  try {
    const res = Babel.transform(code, options as any);
    if (!res || !res.code) return reject(new Error('Transpilation returned empty result'));
    resolve(res.code as string);
  } catch (e) {
    reject(e);
  }
}
