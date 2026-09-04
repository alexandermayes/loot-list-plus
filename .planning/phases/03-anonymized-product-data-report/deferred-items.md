# Deferred Items — Phase 03

Out-of-scope discoveries found during plan execution, logged per the executor's
scope-boundary rule (not fixed, not part of this phase's task files).

## From 03-01

1. **`npm run lint` fails repo-wide with an ESLint config error**, unrelated to
   any file this plan touches:
   ```
   ESLint: 9.39.2
   A configuration object specifies rule "react-hooks/purity", but could not
   find plugin "react-hooks".
   ```
   Pre-existing (`eslint.config.mjs` last touched at commit `b807e2f`,
   "Ratchet React Compiler react-hooks rules to error with grandfathered
   files (#159)"). Confirmed unrelated to this plan: `npx eslint <file>` run
   directly against every file this plan created/modified passes with zero
   errors. Full-project `npm run lint` needs `eslint-plugin-react-hooks`
   registered correctly in `eslint.config.mjs` for the `react-hooks/purity`
   rule to resolve.

2. **`npm run build` cannot complete in this sandbox** because the
   pre-existing `/api/guild-count` route (unrelated to this phase, last
   touched well before this session) requires `SUPABASE_SERVICE_ROLE_KEY` at
   build time to prerender, and that secret is not present in this
   environment (and this executor did not fabricate or source one, since it
   is a real production credential, not a `NEXT_PUBLIC_*` value). Verified
   instead via Turbopack's compile phase (`✓ Compiled successfully`) and by
   grepping the emitted server chunk for this plan's page, which confirmed
   the aggregates JSON import resolves to `h.default.sample.active_guilds...`
   in the compiled bundle rather than a hardcoded number, before the build
   aborted later on the unrelated route. Full `npm run build` should be
   re-verified in CI/Vercel, where `SUPABASE_SERVICE_ROLE_KEY` is genuinely
   configured.
