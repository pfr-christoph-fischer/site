# Import Latest Sermon Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add safe missing-media confirmation and optional extraction and parent-repository push follow-ups to the sermon import command.

**Architecture:** Keep the existing import pipeline intact and add local prompt/subprocess helpers to `scripts/import-latest-sermon.mjs`, with pure decision helpers in `scripts/lib/import-latest-sermon-flow.mjs`. Normal CLI execution remains unchanged outside the requested follow-ups.

**Tech Stack:** Node.js ES modules, Node built-in test runner, existing npm scripts, Git.

**Spec:** `docs/superpowers/specs/2026-11-08-import-latest-sermon-design.md`

## Global Constraints

- Do not commit automatically.
- Preserve non-interactive import behavior.
- Use the `extract:materials` npm alias for the follow-up while preserving the existing singular command.
- Leave unrelated worktree changes untouched.

## Review Focus

- Missing image only: warn and offer abort before creating the folder.
- Missing audio only: warn and offer abort before creating the folder.
- Both media options present: do not issue the missing-media warning.
- Non-TTY execution: do not block on prompts.
- Extraction receives the exact newly imported folder name and `sermons` type.
- Push is offered only after the extraction question.

### Task 1: Add tested prompt decisions and follow-up orchestration

**Files:**
- Create: `test/import-latest-sermon.test.mjs`
- Modify: `scripts/import-latest-sermon.mjs`
- Modify: `package.json` (add a focused `test` script only if needed)

**Interfaces:**
- `hasMissingMediaOptions(overrides) -> boolean`
- `shouldAbortForMissingMedia(answer) -> boolean`
- `shouldRunFollowUp(answer) -> boolean`

- [x] Write failing tests for the three pure decision helpers, including whitespace/case-insensitive yes answers and missing image/audio combinations.
- [x] Run `node --test test/import-latest-sermon.test.mjs` and confirm it fails because the helpers are not available.
- [x] Implement the helpers and use them in the CLI: warn/confirm before directory creation, prompt for extraction after import, invoke `npm run extract:materials -- <folder> sermons`, then prompt and invoke `git push` from the project root.
- [x] Keep prompts disabled for non-TTY execution and print a warning when media options are missing.
- [x] Run the focused test and a syntax check, then inspect the diff and status.
