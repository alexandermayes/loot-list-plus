# post-phase-07 visual baseline

Pairs with: `.planning/workstreams/design-system/baselines/2026-09-16-pre-phase-07/`

Commit range bracketed by this capture (`git log --oneline 073c87fe..010babb3`):

```
010babb3 docs(07-05): update workstream state, roadmap and windows ledger after standby token plan
7d666ef9 docs(07-05): complete standby token and status-primitive palette plan
81927d93 refactor(07-05): render the standby state from its token in raid tracking
0c644a95 refactor(07-05): render status-badge and alert from the semantic palette
3342da80 feat(07-05): add the --standby token in both themes
77d6710b docs(07-04): complete muted and accent contrast, dark surface ramp plan
65197349 fix(07-04): widen the dark surface and border ramp
880b6ef3 feat(07-04): add the --accent-text token and split text-accent from the accent fill
5d6be30f fix(07-04): raise muted text contrast in both themes
3ad3d9bf docs(07-03): update workstream state and roadmap after type scale floor plan
86daba35 docs(07-03): complete type scale floor plan
6b64fd3f feat(07-03): move the remaining sub-11px call sites onto the 11px floor
6c63b82a feat(07-03): raise the type floor to 11px and add the pixel-named scale aliases
4c576225 docs(07-02): complete visual baseline instrument plan
4e12b920 docs(07): capture pre-phase-07 visual baseline
```

What changed between the two captures: the type scale floor moved from 10px to 11px (with all sub-11px call sites swept), dark `--foreground-muted` and light `--accent-text` were raised to clear the 4.5:1 contrast floor, the dark card family was lifted from `228 12% 8%` to `228 12% 13%` with `--border`/`--border-strong`/`--muted` widened to match, and the new `--standby` token replaced the three `orange-500` literals driving `status-badge.tsx`/`alert.tsx`/raid-tracking's standby state.

Same subset as the before capture: Home only (light/dark x 1440/390), 4 images. `overview` is symmetrically skipped in both captures (`GET /api/dev/test-users returned 404` in both manifests) because `loadtest/test-users.json` is still absent in this dev server's environment; the D-16 fallback applies identically on both sides, so the comparison stays Home-only rather than becoming asymmetric. The authenticated Overview page could in principle be captured now if a service-role credential were supplied, but doing so would break the before/after symmetry this baseline exists to prove, so it was not attempted.
