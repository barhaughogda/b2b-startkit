# /next-task - Prepare for Your Next Task

## Purpose
Safely prepare the current worktree for the next task by syncing with production main, and optionally close this worktree and create a fresh one for the new task.

## Usage
Run this command after finishing a task and before starting a new one.

## What it does

### Interactive Flow
1. **Asks for your next task name** (format: `<area>/<slug>`)
   - Examples: `websitebuilder/image-upload`, `scheduling/timezone-fix`
   - Validates the format and checks for collisions

2. **Asks what to do with the current worktree**
   - Continue in this worktree (prepare it, keep working)
   - Close this worktree and start fresh (recommended)

3. **Executes safe global steps**
   - Fetches latest remotes for all worktrees (safe, no file changes)
   - Syncs Cursor config (`.cursor/commands/` and `.cursor/rules/`) across all worktrees

4. **Prepares current worktree**
   - Pulls from upstream (fast-forward only)
   - Merges `origin/main` to bring in latest production code

5. **If "Close and start fresh"**
   - Removes the current worktree folder (branch is preserved on remote)
   - Creates a new worktree from latest `origin/main`
   - Sets up the new task branch and pushes to origin

## Safety Features
- **Clean working tree required**: won't proceed with uncommitted changes
- **Pushed branch required for close**: ensures no work is lost
- **No destructive changes**: no hard resets, no force pushes
- **Fetch-only for other worktrees**: won't disturb work in progress elsewhere

## Best Practices
- Run `/next-task` every time you finish a task and want to start a new one
- Use one worktree per task for best isolation
- Branch naming: `<area>/<slug>` (e.g., `billing/stripe-webhook`)
- Worktree folder: `worktrees/<area>-<slug>` (e.g., `worktrees/billing-stripe-webhook`)

## Run the command
```bash
./scripts/worktree/next-task.sh --interactive
```

## Non-interactive options
```bash
# Just prepare current worktree
./scripts/worktree/next-task.sh --prepare-current

# Just fetch all worktrees
./scripts/worktree/next-task.sh --fetch-all

# Just sync Cursor config
./scripts/worktree/next-task.sh --sync-cursor

# Close current and create new (non-interactive)
./scripts/worktree/next-task.sh --close-and-new websitebuilder/image-upload

# Dry run (preview what would happen)
./scripts/worktree/next-task.sh --dry-run --interactive
```