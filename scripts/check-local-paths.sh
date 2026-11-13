#!/usr/bin/env bash
# Fail if tracked planning or Claude files contain machine-specific absolute
# paths (home directory name, scratch session ids). GSD's installer writes
# these into plan templates and command files; rewrite them repo-relative
# (@.claude/gsd-core/...) or with a neutral placeholder before committing.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

if git ls-files -z -- .planning .claude \
  | xargs -0 grep -InE '/Users/|/private/tmp/claude|/home/'; then
  echo
  echo "Local absolute paths found above. Rewrite them, e.g.:"
  echo "  perl -pi -e 's#\@/Users/[^/]+/(?:[^/]+/)*?\.claude/#\@.claude/#g' <file>"
  exit 1
fi
echo "No local absolute paths in tracked .planning or .claude files."
