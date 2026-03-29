// Worker script for react-native-threads to transpile code off-main-thread
// The worker environment can use `@babel/standalone` to transform code.
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { self } = require('react-native-threads');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Babel = require('@babel/standalone');

  self.onmessage = (msg) => {
    try {
      const data = typeof msg === 'string' ? JSON.parse(msg) : msg;
      const id = data && data.id;
      if (!id) return;
      const code = data.code || '';
      const options = data.options || {};
      try {
        const res = Babel.transform(code, options);
        const out = res && res.code ? res.code : '';
        self.postMessage(JSON.stringify({ id, code: out }));
      } catch (e) {
        self.postMessage(JSON.stringify({ id, error: String(e && e.message ? e.message : e) }));
      }
    } catch (e) {
      // ignore
+    }
  };
} catch (e) {
  // Worker not available or failed — nothing to do
}
