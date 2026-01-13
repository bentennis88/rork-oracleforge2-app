module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      'module:metro-react-native-babel-preset',
      'module:@babel/preset-env',
      'module:@babel/preset-react',
      'module:@babel/preset-typescript',
    ],
    plugins: [
      'module:@babel/plugin-transform-runtime',
      'module:@babel/plugin-proposal-class-properties',
      'module:@babel/plugin-transform-modules-commonjs',
    ],
  };
};