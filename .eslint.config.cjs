/** @type { import("eslint").Linter.FlatConfig } */
const baseConfig = require("./packages/config/eslint.config.cjs");

module.exports = {
  ...baseConfig,
  // Root-level overrides can be added here if needed
};
