# /cursor-sync - Sync Cursor Commands and Rules Across All Worktrees (Bidirectional)

## Purpose
Ensure all Cursor commands (`.cursor/commands/`) and rules (`.cursor/rules/`) are synchronized across all git worktrees. **This is bidirectional** - if you add a command or rule to ANY worktree, it will be synced to ALL worktrees automatically.

## What it does
The script collects all Cursor configuration files from ALL worktrees (including main) and syncs them everywhere:
- **Commands**: All `.cursor/commands/*.md` files from all worktrees
- **Rules**: All `.cursor/rules/**/*.mdc` files from all worktrees
- **MCP Config**: `.cursor/mcp.json` file (uses most recent version)

**Key Feature**: If you add a new command in any worktree, running `/cursor-sync` will add it to all other worktrees. You don't need to remember which worktree has what!

## Usage
Simply invoke `/cursor-sync` and the AI will run the sync script for you.

## When to use
- After adding new Cursor commands or rules to ANY worktree
- When setting up a new worktree
- After updating Cursor configuration anywhere
- Periodically to ensure consistency across worktrees
- **Anytime you want to ensure all worktrees are in sync**

## How it works
The script uses a bidirectional sync strategy:
1. **Collection Phase**: Scans ALL worktrees (including main) to find all commands and rules
2. **Merge Phase**: Creates a master collection using the most recent version of each file
3. **Sync Phase**: Copies the master collection to ALL worktrees (including main)
4. **Result**: Every worktree ends up with the same complete set of files

**Conflict Resolution**: If the same file exists in multiple worktrees, the script uses the most recently modified version. For ties, it prefers the main worktree.

## Run the command
```bash
./scripts/sync-cursor-config.sh
```

## Options
```bash
# Dry run (preview changes without making them)
./scripts/sync-cursor-config.sh --dry-run

# Verbose output (show all file operations)
./scripts/sync-cursor-config.sh --verbose

# Force overwrite all files (even if unchanged)
./scripts/sync-cursor-config.sh --force

# Cleanup old files that don't exist in main
./scripts/sync-cursor-config.sh --cleanup

# Combine options
./scripts/sync-cursor-config.sh --verbose --cleanup
```

## Safety
- Only copies files, never deletes (unless using `--cleanup`)
- Compares files before overwriting (unless using `--force`)
- Safe to run anytime - won't break existing worktrees
- Can preview changes with `--dry-run` first

## AI Instructions
When the user invokes `/cursor-sync`:
1. Run the sync script: `./scripts/sync-cursor-config.sh --verbose`
2. The script will:
   - Collect all commands/rules from ALL worktrees
   - Show which files were found in which worktrees
   - Sync the complete collection to all worktrees
3. Report the results showing:
   - How many files were collected
   - Which worktrees contributed files
   - Which files were synced to each worktree
4. Confirm all worktrees now have the same complete Cursor configuration

