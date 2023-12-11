#!/usr/bin/env bash
set -euo pipefail
aiken check 2>&1 | awk 'NR>=5' | sed -n '/check::unused/q;p'
# aiken check 2>&1 | awk 'NR>=5' | sed -n '/check::unused/q;p' > out

