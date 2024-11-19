const typescriptParser = require("@typescript-eslint/parser");
const eslintPlugin = require("@typescript-eslint/eslint-plugin");
const prettierPlugin = require("eslint-plugin-prettier");
const eslintConfigPrettier = require("eslint-config-prettier");
const prettierRecommended = require("eslint-plugin-prettier/recommended");

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    ignores: [
      ".eslintrc.json",
      "node_modules",
      "lib/**",
      "src/__tests__/**",
      "examples/**",
    ],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
      globals: {
        // these are the global variables added by "env: { node: true, jest: true }"
        module: "readonly",
        require: "readonly",
        __dirname: "readonly",
        process: "readonly",
        jest: "readonly",
        describe: "readonly",
        it: "readonly",
        expect: "readonly",
        test: "readonly",
        beforeAll: "readonly",
        beforeEach: "readonly",
        afterAll: "readonly",
        afterEach: "readonly",
      },
    },
    plugins: {
      "@typescript-eslint": eslintPlugin,
      prettier: prettierPlugin,
    },
    rules: {
      "@typescript-eslint/interface-name-prefix": "off",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
    settings: {},
  },
  eslintConfigPrettier,
  prettierRecommended,
];
