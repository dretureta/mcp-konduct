# Settings Backup & Restore Implementation Plan

**Date:** 2026-03-25

## Goal

Implement Export/Import backup for MCP configuration (servers, tools, projects, project relations) and replace Settings placeholder with a working page.

## Architecture Summary

- Backend owns import/export logic and validation.
- Frontend Settings page orchestrates user flows (download, upload, preview, apply).
- Import supports `merge` and `replace`, both with `dryRun` preview.

## Tasks

### Task 1: Backend backup schema + export endpoint

Files:
- Modify `src/web/index.ts`
- Add validation schema (inline or new helper in `src/web/`)

Steps:
1. Add TypeScript/Zod schema for `konduct-backup-v1` payload.
2. Add `GET /api/settings/export` endpoint.
3. Query and map rows from `servers`, `tools`, `projects`, `project_servers`.
4. Return backup payload with metadata.

Definition of done:
- Endpoint returns valid JSON payload with current state.

### Task 2: Backend import endpoint with dry-run

Files:
- Modify `src/web/index.ts`

Steps:
1. Add `POST /api/settings/import` endpoint.
2. Parse query params: `mode`, `dryRun`.
3. Validate body against backup schema.
4. Implement impact analysis summary for dry run.
5. Return summary and messages without writes when `dryRun=true`.

Definition of done:
- Dry run returns clear summary for merge/replace.

### Task 3: Apply import (merge + replace)

Files:
- Modify `src/web/index.ts`

Steps:
1. Implement `merge` import writes:
   - Upsert/reconcile servers/projects/tools.
   - Add relations where valid.
2. Implement `replace` import writes in transaction:
   - Clear tables in safe order.
   - Insert imported data.
3. Return applied summary.

Definition of done:
- Real imports work and maintain referential integrity.

### Task 4: Frontend API client methods

Files:
- Modify `src/web/client/src/utils/api.ts`

Steps:
1. Add settings API methods:
   - `exportConfig()`
   - `previewImport(file, mode)`
   - `applyImport(file, mode)`
2. Type responses in `src/web/client/src/types/index.ts`.

Definition of done:
- Frontend can call export/import endpoints with typed responses.

### Task 5: Build Settings page UI

Files:
- Add `src/web/client/src/pages/Settings.tsx`
- Modify `src/web/client/src/App.tsx`

Steps:
1. Replace Settings placeholder route with real page.
2. Add Backup & Restore card:
   - Export button.
   - File upload.
   - Mode selector (`merge`/`replace`).
   - Preview + Apply actions.
3. Add summary panel and error states.
4. Add replace confirmation guard.

Definition of done:
- Full Settings backup flow is usable end-to-end.

### Task 6: QA and verification

Files:
- No code-specific new files required

Steps:
1. Run `npm run build`.
2. Manual smoke test:
   - Export file downloads.
   - Dry-run merge summary shown.
   - Apply merge works.
   - Apply replace works after confirm.
3. Confirm dashboard/pages still load.

Definition of done:
- Build passes and backup workflow is validated.

## Commit Strategy

- Commit per task (as requested).
- Commit message style:
  - `feat(settings): add backup export endpoint`
  - `feat(settings): add import dry-run analysis`
  - `feat(settings): apply merge/replace import`
  - `feat(client): add settings backup api methods`
  - `feat(settings): implement backup and restore page`
  - `chore: verify build for settings backup flow`
