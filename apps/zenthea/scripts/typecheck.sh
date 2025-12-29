#!/bin/bash
# Typecheck script that filters out Convex errors during migration
# This is temporary until Convex is fully migrated away

# Run typecheck and filter out convex errors
OUTPUT=$(tsc --noEmit 2>&1)
FILTERED=$(echo "$OUTPUT" | grep -v "convex/")

# Check if there are any non-convex errors
if echo "$FILTERED" | grep -q "error TS"; then
  echo "$FILTERED"
  exit 1
else
  # No errors or only convex errors (which we ignore)
  exit 0
fi
