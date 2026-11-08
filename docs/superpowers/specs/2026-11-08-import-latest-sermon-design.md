# Import Latest Sermon Follow-up Design

## Intent

Make `npm run import:latest-sermon` safer and more complete for interactive use: warn when either local media option is absent, offer to extract the new sermon immediately, and then offer to push the parent repository.

## Scope and constraints

- Preserve the existing Pfarrplaner fetch, download, frontmatter, and hidden-sermon behavior.
- Do not alter non-interactive imports except for the missing-media warning; non-interactive execution continues without waiting for input.
- Warn before creating the target folder when `--image` or `--audio` is missing.
- Run the existing extraction command for the exact imported folder when accepted.
- Push the whole parent repository only after extraction has been offered and only when accepted.
- Do not commit changes automatically.

## Approach

Add small prompt and subprocess helpers directly to `scripts/import-latest-sermon.mjs`, with pure decision helpers in a small library module. This keeps the change local and makes the yes/no decisions testable without refactoring the import pipeline. The extraction prompt invokes the `extract:materials` npm alias, passing the new folder name and `sermons`; the final prompt invokes `git push` from the project root.

## Decisions

- Missing media means one or both local overrides are absent, regardless of whether Pfarrplaner may provide downloadable media.
- A positive answer to the missing-media prompt aborts before any target directory is created.
- In non-TTY execution, warnings are printed and the workflow continues; follow-up prompts default to no.
- Extraction and push errors are allowed to fail the command so the user sees that the requested follow-up did not complete.
