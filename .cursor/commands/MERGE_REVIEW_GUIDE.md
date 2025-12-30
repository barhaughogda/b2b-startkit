# Merge Review Guide: Distinguishing New vs Existing Issues

## Problem Statement

When reviewing PRs, it's critical to only flag **NEW issues introduced by the PR**, not existing issues that were already in the main branch. This prevents false positives and focuses review on actual changes.

## How to Check if an Issue is NEW

### 1. Check Console Statements

**Step 1: See what's NEW in the PR:**
```bash
git diff origin/main...HEAD | grep "^+.*console\."
```

**Step 2: Check if it exists in main:**
```bash
git show origin/main:path/to/file.ts | grep -n "console\."
```

**Step 3: Compare line numbers:**
- If the line number from Step 1 matches something in Step 2 → **EXISTING** (don't flag)
- If the line number is new → **NEW** (flag it)

**Example:**
```bash
# Check what's new
git diff origin/main...HEAD src/components/patient/PatientAppointmentsList.tsx | grep "^+.*console.error"
# Output: +      console.error('Appointment missing ID:', appointment);

# Check what exists in main
git show origin/main:src/components/patient/PatientAppointmentsList.tsx | grep -n "console.error"
# If no output → This is NEW, flag it
# If output exists → Compare line numbers to see if it's the same line
```

### 2. Check Merge Conflicts

**Proper way (doesn't modify working directory):**
```bash
git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD
```

**What to look for:**
- If output contains `<<<<<<<`, `=======`, `>>>>>>>` → **CONFLICT EXISTS** (blocker)
- If output is clean → **NO CONFLICTS** (proceed)

**WRONG way (modifies working directory):**
```bash
git checkout -b test-merge
git merge origin/main  # This modifies files!
```

### 3. Check TODOs

**Step 1: Find NEW TODOs:**
```bash
git diff origin/main...HEAD | grep "^+.*TODO"
```

**Step 2: Check if TODO exists in main:**
```bash
git show origin/main:path/to/file.ts | grep -n "TODO"
```

**Step 3: Only flag if NEW**

### 4. Check Debug Code

**Step 1: Find NEW debug code:**
```bash
git diff origin/main...HEAD | grep -E "^\+.*(debugger|console\.(log|debug)|@ts-ignore|eslint-disable)"
```

**Step 2: Check if it exists in main:**
```bash
git show origin/main:path/to/file.ts | grep -E "(debugger|console\.(log|debug)|@ts-ignore|eslint-disable)"
```

**Step 3: Only flag if NEW**

## Common Mistakes to Avoid

### ❌ Mistake 1: Flagging All Console Statements in Diff
```bash
# WRONG - This shows ALL console statements in changed files
git diff origin/main...HEAD | grep "console\."
```

**Why it's wrong:** This includes existing console statements that were already in main.

**Correct approach:**
```bash
# RIGHT - Only shows NEW additions (lines starting with +)
git diff origin/main...HEAD | grep "^+.*console\."
```

### ❌ Mistake 2: Testing Merge Conflicts by Creating Branches
```bash
# WRONG - Modifies working directory
git checkout -b test-merge
git merge origin/main
```

**Why it's wrong:** This creates conflicts in your working directory and modifies files.

**Correct approach:**
```bash
# RIGHT - Doesn't modify anything
git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD
```

### ❌ Mistake 3: Assuming All Issues in Changed Files are New
**Wrong assumption:** "This file was changed, so all issues in it are new."

**Reality:** Files can be modified without introducing new issues. Always verify if the issue existed in main.

## Verification Checklist

Before flagging an issue as a blocker, verify:

- [ ] Issue appears in `git diff origin/main...HEAD` with `^+` prefix (new addition)
- [ ] Issue does NOT exist in `git show origin/main:file` (not in main)
- [ ] Line numbers match (if checking specific lines)
- [ ] Issue is actually introduced by this PR's changes

## Example Workflow

```bash
# 1. Check current branch
git branch --show-current

# 2. Check merge conflicts (no modifications)
git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD

# 3. Check NEW console statements
git diff origin/main...HEAD | grep "^+.*console\." > /tmp/new_console.txt
for file in $(git diff --name-only origin/main...HEAD); do
  echo "Checking $file..."
  git show origin/main:$file 2>/dev/null | grep -n "console\." > /tmp/existing_console.txt
  # Compare new vs existing
done

# 4. Check NEW TODOs
git diff origin/main...HEAD | grep "^+.*TODO"

# 5. Review only NEW issues
```

## Summary

**Golden Rule:** Only flag issues that are **NEW additions** (lines starting with `+` in git diff) that don't exist in the main branch.

**Key Commands:**
- `git diff origin/main...HEAD | grep "^+.*pattern"` - Find NEW additions
- `git show origin/main:file` - Check what exists in main
- `git merge-tree $(git merge-base origin/main HEAD) origin/main HEAD` - Test conflicts safely






















