module.exports = function (api) {
  api.cache(true);
  return {
    // Expo projects should use `babel-preset-expo` unless you also install and manage
    // all referenced presets/plugins yourself. The previous config caused Metro bundling
    // to fail with missing plugin errors (e.g. @babel/plugin-proposal-class-properties).
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};