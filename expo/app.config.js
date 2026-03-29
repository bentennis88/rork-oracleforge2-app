// app.config.js
// This config reuses your existing app.json and injects env-based values.
// Expo (SDK 54) will load `.env` variables (especially `EXPO_PUBLIC_*`) into `process.env`
// when running via the Expo CLI / bundler.

const appJson = require('./app.json');

module.exports = {
  expo: {
    ...appJson.expo,
    extra: {
      ...(appJson.expo?.extra || {}),
      EXPO_PUBLIC_XAI_API_KEY: process.env.EXPO_PUBLIC_XAI_API_KEY,
    },
  },
};

