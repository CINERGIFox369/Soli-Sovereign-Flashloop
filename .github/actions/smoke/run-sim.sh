#!/usr/bin/env bash
set -euo pipefail

SIM_MIN=${SIM_MIN_SUCCESS:-1}
echo "Simulator smoke check: min successes/day = $SIM_MIN"

echo "Installing dependencies (ci)..."
npm ci

echo "Running simulator (sim:mc)..."
npm run sim:mc | tee sim-output.txt

SUCC_LINE=$(grep "Avg successes/day" sim-output.txt || true)
if [ -z "$SUCC_LINE" ]; then
  echo "Simulator did not produce expected output" >&2
  exit 2
fi

SUCC=$(echo "$SUCC_LINE" | awk '{print $3}')
echo "Simulator result: Avg successes/day = $SUCC"

awk -v s="$SUCC" -v m="$SIM_MIN" 'BEGIN{if(s+0 < m+0){print "Result: below threshold"; exit 1} else {print "Result: ok"; exit 0}}'
