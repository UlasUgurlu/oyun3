// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    files: ["src/hooks/useNabizGame.ts"],
    // Reanimated SharedValue.value is intentionally mutable animation state.
    rules: { "react-hooks/immutability": "off" },
  }
]);
