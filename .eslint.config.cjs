/** @type { import("eslint").Linter.FlatConfig } */
module.exports = {
  root: true,
  extends: [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "plugin:svelte/recommended",
    "plugin:drizzle/recommended",
    "prettier",
  ],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint", "drizzle"],
  parserOptions: {
    sourceType: "module",
    ecmaVersion: 2022,
    extraFileExtensions: [".svelte"],
  },
  env: {
    browser: true,
    es2022: true,
    node: true,
  },
  rules: {
    // TypeScript specific rules
    "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/prefer-const": "error",
    "@typescript-eslint/no-var-requires": "off",
    
    // General JavaScript rules
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": ["error", "always"],
    "prefer-template": "error",
    "prefer-arrow-callback": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    
    // Import/export rules
    "no-duplicate-imports": "error",
    
    // Accessibility rules
    "svelte/a11y-click-events-have-key-events": "error",
    "svelte/a11y-no-static-element-interactions": "error",
    "svelte/a11y-label-has-associated-control": "error",
  },
  overrides: [
    {
      files: ["*.svelte"],
      parser: "svelte-eslint-parser",
      parserOptions: {
        parser: "@typescript-eslint/parser",
      },
      rules: {
        // Svelte 5 specific adjustments
        "@typescript-eslint/no-unused-vars": ["error", { 
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        }],
      },
    },
    {
      files: ["*.test.ts", "*.spec.ts", "tests/**/*"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "no-console": "off",
      },
    },
    {
      files: ["*.config.*", "vite.config.*", "playwright.config.*"],
      rules: {
        "@typescript-eslint/no-var-requires": "off",
        "object-shorthand": "off",
      },
    },
  ],
  ignorePatterns: [
    ".DS_Store",
    "node_modules/",
    "build/",
    ".svelte-kit/",
    "package/",
    "dist/",
    "coverage/",
    ".env",
    ".env.*",
    "!.env.example",
    "pnpm-lock.yaml",
    "package-lock.json",
    "yarn.lock",
    "drizzle/",
    "static/",
    "docs/",
    "*.md",
    "!src/**/*",
    "!tests/**/*",
  ],
};
