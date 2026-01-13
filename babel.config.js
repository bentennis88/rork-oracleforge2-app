module.exports = function (api) {
  api.cache(true);
  return {
    // Expo/Metro expects `babel-preset-expo` in most projects. Custom plugin stacks
    // require installing all referenced presets/plugins, otherwise bundling fails.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
  };
};