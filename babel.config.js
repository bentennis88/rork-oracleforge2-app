module.exports = {
  presets: [
    ['@babel/preset-env', { targets: 'node', useBuiltIns: 'use-dynamic-import' }],
    ['@babel/preset-typescript'],
  ],
  plugins: [
    ['@babel/plugin-transform-runtime'],
    ['@babel/plugin-proposal-class-properties'],
    ['@babel/plugin-proposal-json-stringify']
  ],
  sourceFileName: "babel.config.js",
};