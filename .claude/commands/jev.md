---
name: jev
description: Turn the Jev router on or off, or check its status, tier counts and cost
argument-hint: "[on | off | status]"
allowed-tools:
  - Bash
---

Run `node .claude/jev/jev.cjs $ARGUMENTS` from the project root and print its output verbatim. Do not summarize, paraphrase, or trim it, and especially do not drop or reword the privacy line, since its exact wording is the point of the command.

The router state lives at `.claude/jev/state.json`, is project scoped, and persists across sessions. OFF is the default after a fresh clone, and OFF is the direction every failure falls toward. Running `on` starts sending message text to TypeSafe via OpenRouter for every routed message; running `off` stops it.
