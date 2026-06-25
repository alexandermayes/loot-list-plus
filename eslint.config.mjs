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
  // The React Compiler-aware react-hooks rules are enforced as ERRORS for all
  // code by default, so any NEW violation fails CI. The files listed in the
  // overrides below still trip these rules on pre-existing patterns and are
  // grandfathered down to "warn" until refactored. Ratchet: when a file's
  // violations are fixed, remove it from its list; when a list is empty, drop
  // the override so the rule is fully enforced. (Paths under app/(app) and
  // [slug] escape the glob-special parens/brackets.)
  {
    rules: {
      "react-hooks/purity": "error",
      "react-hooks/set-state-in-effect": "error",
      "react-hooks/refs": "error",
      "react-hooks/immutability": "error",
      "react-hooks/preserve-manual-memoization": "error",
    },
  },
  {
    files: [
      "app/components/landing/BlogTracker.tsx",
      "app/components/landing/ClickEffects.tsx",
      "app/components/landing/LandingFeatures.tsx",
      "utils/analytics/client.ts",
    ],
    rules: { "react-hooks/purity": "warn" },
  },
  {
    files: [
      "app/\\(app\\)/help/\\[slug\\]/_client.tsx",
      "app/\\(app\\)/help/_client.tsx",
      "app/\\(app\\)/master-sheet/components/BossSection.tsx",
      "app/components/ItemLink.tsx",
      "app/components/NotificationContainer.tsx",
      "app/components/Sidebar.tsx",
      "app/components/ThemeSelector.tsx",
      "app/contexts/ExpansionContext.tsx",
      "app/contexts/SidebarContext.tsx",
      "app/hooks/usePendingSubmissionCount.ts",
      "app/hooks/useRaidTeam.ts",
      "app/hooks/useResubmitCount.ts",
      "utils/feature-flags.ts",
    ],
    rules: { "react-hooks/set-state-in-effect": "warn" },
  },
  {
    files: ["app/\\(app\\)/loot-list/components/LootListContent.tsx"],
    rules: { "react-hooks/refs": "warn" },
  },
  {
    files: [
      "app/components/CreateCharacterModal.tsx",
      "app/components/JoinGuildModal.tsx",
      "app/components/WelcomeScreen.tsx",
      "app/contexts/NotificationContext.tsx",
      "companion/src/renderer/components/Settings.tsx",
    ],
    rules: { "react-hooks/immutability": "warn" },
  },
  {
    files: ["app/contexts/ExpansionContext.tsx"],
    rules: { "react-hooks/preserve-manual-memoization": "warn" },
  },
]);

export default eslintConfig;
