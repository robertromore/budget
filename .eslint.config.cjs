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
    "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
    "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
    "@typescript-eslint/no-inferrable-types": "error",
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    
    // General JavaScript rules
    "prefer-const": "error",
    "no-var": "error",
    "object-shorthand": ["error", "always"],
    "prefer-template": "error",
    "prefer-arrow-callback": "error",
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "error",
    "no-alert": "error",
    
    // Import/export rules
    "no-duplicate-imports": "error",
    "sort-imports": ["error", { 
      ignoreCase: true, 
      ignoreDeclarationSort: true, 
      ignoreMemberSort: false,
      allowSeparatedGroups: true
    }],
    
    // Code quality rules
    "eqeqeq": ["error", "always"],
    "curly": ["error", "all"],
    "no-eval": "error",
    "no-implied-eval": "error",
    "no-new-func": "error",
    
    // Accessibility rules
    "svelte/a11y-click-events-have-key-events": "error",
    "svelte/a11y-no-static-element-interactions": "error",
    "svelte/a11y-label-has-associated-control": "error",
    "svelte/a11y-role-has-required-aria-props": "error",
    "svelte/a11y-aria-props": "error",
    
    // Svelte 5 runes and patterns
    "svelte/no-reactive-literals": "error",
    "svelte/prefer-destructuring-assignment": "error",
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
    {
      files: ["src/lib/hooks/**/*.svelte.ts", "src/lib/hooks/**/*.ts"],
      rules: {
        // Hooks should use consistent naming patterns
        "no-restricted-syntax": [
          "error",
          {
            "selector": "FunctionDeclaration[id.name!=/^use[A-Z]/]",
            "message": "Hook functions should start with 'use' followed by a capital letter"
          }
        ],
        // Allow any in hook return types for flexibility
        "@typescript-eslint/no-explicit-any": "warn",
      },
    },
    {
      files: ["src/lib/components/compound/**/*.svelte"],
      rules: {
        // Compound components may use complex patterns
        "@typescript-eslint/no-explicit-any": "warn",
        "svelte/no-reactive-literals": "off",
      },
    },
    {
      files: [".templates/**/*.svelte", ".templates/**/*.ts"],
      rules: {
        // Templates may have intentional unused vars for examples
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
        "no-console": "off",
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
