module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['module:metro-react-native-babel-preset', '@babel/preset-env', '@babel/preset-react', '@babel/preset-typescript'],
    plugins: [
      '@babel/plugin-transform-runtime',
      '@babel/plugin-proposal-class-properties',
      '@babel/plugin-transform-modules-commonjs',
      '@babel/plugin-transform-async-to-generator',
      '@babel/plugin-transform-template-literals',
      '@babel/plugin-transform-arrow-functions',
      '@babel/plugin-syntax-jsx', // Extra for JSX errors
    ],
  };
};