#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REMOTE_NAME="${REMOTE_NAME:-ash-typescript-upstream}"
REMOTE_URL="${REMOTE_URL:-https://github.com/ash-project/ash_typescript.git}"
REF="${1:-v0.15.3}"
PREFIX="vendor/ash_typescript"

cd "$ROOT_DIR"

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote add "$REMOTE_NAME" "$REMOTE_URL"
fi

git fetch "$REMOTE_NAME" --tags

if [ -d "$PREFIX/.git" ] || git log --format=%B -- "$PREFIX" | grep -q "git-subtree-dir: $PREFIX"; then
  git subtree pull --prefix="$PREFIX" "$REMOTE_NAME" "$REF" --squash
else
  git subtree add --prefix="$PREFIX" "$REMOTE_NAME" "$REF" --squash
fi
