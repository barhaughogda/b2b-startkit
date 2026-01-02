# Cursor project configuration

This repo uses Cursor **Project Rules** and **Project Commands**.

## Project Rules
Rules live in `.cursor/rules/<rule-name>/RULE.md`.

- Rules are version-controlled and shared with the team.
- Most rules here are `alwaysApply: true` to ensure consistent guardrails.
- You can add more rules via **Cursor Settings → Rules, Commands** (recommended).

Docs: `https://cursor.com/docs/context/rules`

## Project Commands
Commands live in `.cursor/commands/*.md`.

- The filename becomes the command name (e.g. `xtdd.md` → `/xtdd`).
- In chat, type `/` to see available commands.
- Cursor merges commands from **Project** (`.cursor/commands`), **Global** (`~/.cursor/commands`), and **Team** (dashboard). If names collide (e.g. `/xtdd` exists in both project + global), one may shadow the other depending on Cursor version—avoid duplicates if you want predictable behavior.

This repo includes common workflow commands like `/pr`, `/pr-review`, `/merge`, `/fix`, `/run-tests-and-fix`, plus `/xsecurity`, `/xarchitecture`, `/xtdd`, `/xtest`.

Docs: `https://cursor.com/docs/agent/chat/commands`

## Legacy
A legacy `.cursorrules` file exists at repo root for backward compatibility, but Cursor is migrating toward `.cursor/rules`.
