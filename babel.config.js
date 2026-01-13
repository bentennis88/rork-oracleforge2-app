module.exports = function (api) {
  api.cache(true);
  const optionalPlugins = [];
  try {
    // These are present in many Expo projects via @babel/* deps; include only if resolvable.
    require.resolve('@babel/plugin-transform-async-to-generator');
    optionalPlugins.push('@babel/plugin-transform-async-to-generator');
  } catch {}
  try {
    require.resolve('@babel/plugin-transform-regenerator');
    optionalPlugins.push('@babel/plugin-transform-regenerator');
  } catch {}

  return {
    // Expo/Metro expects `babel-preset-expo` in most projects. Custom plugin stacks
    // require installing all referenced presets/plugins, otherwise bundling fails.
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: optionalPlugins,
  };
};