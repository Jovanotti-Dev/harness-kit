#!/bin/bash
# Harness verification for harness-kit. Run from repo root.
# Usage: ./verify.sh [build|test|lint|all]   (default: build)
# Always ends with a machine-parseable line: HARNESS_VERIFY: PASS|FAIL
set -eo pipefail

MODE="${1:-build}"

fail() { echo "HARNESS_VERIFY: FAIL ($1)"; exit 1; }

run_build() {
  echo "No build script in package.json — nothing to check."
}

run_test() {
  npm run test || fail "test"
}

run_lint() {
  echo "No lint script in package.json — nothing to check."
}

case "$MODE" in
  build) run_build ;;
  test)  run_test ;;
  lint)  run_lint ;;
  all)   run_build && run_test && run_lint ;;
  *)     echo "Unknown mode: $MODE (use build|test|lint|all)"; exit 2 ;;
esac

echo "HARNESS_VERIFY: PASS ($MODE)"
