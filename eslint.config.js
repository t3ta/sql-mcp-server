import tseslint from "typescript-eslint";
import globals from "globals";
import eslint from "@eslint/js";

export default tseslint.config(
  {
    ignores: ["dist/**/*", "node_modules/**/*"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
      sourceType: "module",
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-prototype-builtins": "off",
      "no-undef": "off",
      "no-console": [
        "error",
        {
          allow: ["warn", "error"],
        },
      ],
    },
  }
);
