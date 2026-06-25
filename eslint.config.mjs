import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Plain `.js`/`.cjs` files in this repo (dev scripts under scripts/, the
  // separately-deployed discord-bot, k6 load tests) are CommonJS — the repo
  // has no "type": "module". `require()` is correct there, so the
  // ESM-oriented no-require-imports rule must not flag them.
  {
    files: ["**/*.js", "**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // The React Compiler-aware react-hooks rules (purity / set-state-in-effect /
  // refs-during-render / immutability) are aggressive correctness hints. Many
  // existing components trip them on benign patterns (e.g. Math.random in
  // landing-page visual effects). Keep them visible as warnings rather than
  // failing CI on the whole codebase; tighten back to "error" as they're fixed.
  {
    rules: {
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
]);

export default eslintConfig;
