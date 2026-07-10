import { defineConfig } from "oxlint";

export default defineConfig({
  rules: {
    "@typescript-eslint/no-floating-promises": "warn",
    "@typescript-eslint/ban-types": "off",
    "@typescript-eslint/no-empty-object-type": "off",
    "@typescript-eslint/no-explicit-any": "off",
  },
});
