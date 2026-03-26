# Design Spec: Settings + MCP Backup (Export/Import)

**Date:** 2026-03-25  
**Status:** Proposed (approved in chat)  
**Owner:** Dashboard/Web

## 1) Goal

Add a real Settings page and implement a robust backup workflow so users can export and import MCP configuration safely.

Primary target:
- Export and import **all configuration data** (without logs) for backup and migration.

Scope includes:
- New backend API for export/import.
- New Settings page UI with Backup & Restore section.
- Import preview (dry run) and safe execution modes.

## 2) User Problem

Users need to:
- Back up current MCP setup.
- Move setup across machines/environments.
- Restore quickly after accidental changes.

Current app has no real Settings page and no backup/restore actions.

## 3) In Scope

1. Export snapshot to JSON containing:
   - servers
   - tools
   - projects
   - project-server relations
2. Import from JSON with two modes:
   - `merge`: preserve existing and upsert compatible records.
   - `replace`: replace current configuration with imported data.
3. Preview mode (`dryRun`) before applying import.
4. Settings UI for export/import and basic DB info.

## 4) Out of Scope

- Export/import of `request_logs`.
- Scheduled backups.
- Encryption at rest for backup files.
- Multi-file archive formats (zip/tar).

## 5) Data Contract (Backup v1)

```json
{
  "version": "konduct-backup-v1",
  "exportedAt": "2026-03-25T12:00:00.000Z",
  "appVersion": "1.0.0",
  "data": {
    "servers": [],
    "tools": [],
    "projects": [],
    "projectServers": []
  }
}
```

Notes:
- `projectServers` is an array of `{ projectId, serverId }`.
- `tools` are included so enable/disable state can be restored.
- Logs intentionally excluded.

## 6) Backend API Design

### 6.1 Export
- `GET /api/settings/export`
- Response: JSON backup payload (`konduct-backup-v1`).

### 6.2 Import
- `POST /api/settings/import?mode=merge|replace&dryRun=true|false`
- Body: backup JSON.
- Response:
  - `success: boolean`
  - `mode`
  - `dryRun`
  - `summary: { created, updated, skipped, removed, errors }`
  - `messages: string[]`

Validation:
- Reject invalid or unsupported `version`.
- Validate shape with Zod.
- Reject malformed references (e.g., relation with missing project/server).

### 6.3 Behavior Rules

#### Merge mode
- Servers: match by `id`, fallback by `name`.
- Projects: match by `id`, fallback by `name`.
- Tools: match by `id`.
- Relations: add if both sides exist after reconciliation.
- Never hard-delete existing records in merge.

#### Replace mode
- Run in a DB transaction.
- Clear config tables in safe order:
  - `project_servers`
  - `tools`
  - `projects`
  - `servers`
- Insert imported data.
- Roll back on error.

#### Dry run
- No writes.
- Return exact impact estimation and errors.

## 7) Settings Page Design

Route:
- `/settings`

Sections:
1. **Backup & Restore**
   - Export button (`Download JSON`).
   - File input for import.
   - Mode selector: `merge` or `replace`.
   - Preview button (dry run) and Apply button.
   - Confirmation guard for `replace`.
2. **Database Info**
   - Show `dbPath` from stats.
3. **Future-ready placeholders**
   - Preferences and maintenance cards (read-only for now).

UX constraints:
- Clear danger styling for replace mode.
- Show summary block before apply.
- Show inline error messages from import validation.

## 8) Error Handling

- Invalid JSON file: show parse error.
- Unsupported version: show explicit compatibility error.
- Replace failure: transactional rollback + error toast/message.
- Partial merge issues: report in `summary.errors` and `messages`.

## 9) Security and Safety

- No execution from imported content.
- Strict schema validation before processing.
- Limit payload size (reasonable cap, e.g. 5MB).
- Replace requires explicit user confirmation.

## 10) Test Strategy

Backend:
- Export returns valid `konduct-backup-v1` payload.
- Import dry-run merge returns correct summary.
- Import apply merge writes expected rows.
- Import apply replace overwrites config and preserves consistency.
- Invalid schema/version returns 400 with clear message.

Frontend:
- Settings route renders correctly.
- Export triggers file download.
- Import preview shows summary.
- Apply disabled until preview success.
- Replace mode shows warning and confirm flow.

## 11) Rollout Plan

1. Add backend endpoints and schema validation.
2. Add frontend API client methods.
3. Build Settings page and wire route.
4. Validate with build + manual smoke tests.

## 12) Success Criteria

- User can export a full config JSON backup.
- User can import that backup in merge/replace mode.
- Dry-run preview works and prevents blind writes.
- Settings is no longer a placeholder page.
