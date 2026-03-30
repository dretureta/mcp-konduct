# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- *(nothing yet — all new features are in v1.6.2)*

---

## [1.6.2] - 2026-03-30

### Added

- **Project-Level Logging** — Each tool call now logs `project_id`, `project_name`, and `router_session_id` for full traceability across project-scoped sessions.
- **UUID-Based Tool IDs** — Tool IDs migrated from compound format `${serverId}__${toolName}` to pure UUIDs. Eliminates collisions with tool names containing `__`.
- **Auto-Discover on Startup** — Servers with zero registered tools are automatically discovered when the router starts.
- **ENV Vars in ServerForm** — Web dashboard form now accepts per-server environment variables in `KEY=VALUE` format.

### Improved

- **Enhanced JSON Schema Support** — `buildInputSchema` now handles `enum`, `anyOf`/`oneOf`, type arrays, and `nullable` fields.
- **Toast Notifications** — All error and success operations surface user feedback via the Toast component.
- **Dynamic CLI Version** — CLI reads version from `package.json` at runtime instead of hardcoding.
- **Log Retention** — Request logs older than 30 days are automatically purged on startup.
- **SQL JOIN for Project Tools** — `getProjectTools` uses a proper SQL JOIN instead of in-memory filtering.

### Fixed

- `doctor` command no longer blocks indefinitely — `execSync` replaced with `spawnSync` + 5s timeout.
- `getConnection` and `discoverTools` now support SSE and Streamable-HTTP transports in addition to stdio.

### Infrastructure

- **88 Vitest Unit Tests** — Covering `registry`, `aggregator`, and `proxy` core modules.
- **GitHub Actions CI** — Runs on Node 20/22 with build + test + coverage. Triggers on `main`.
- **Automated Releases** — GitHub Release created on merge to `main` with `tar.gz` archive and conventional-commits release notes.
- **Database Migration** — Additive migration for `request_logs` columns so existing installations upgrade seamlessly.

---

## [1.6.0] - Previous (pre-changelog rework)

### Already Implemented

- Multi-server MCP registry (stdio, SSE, streamable-http)
- Project-scoped MCP mode
- Optional web dashboard
- SQLite-backed storage
- Claude, Cursor, OpenCode config helpers
- Health diagnostics via `konduct doctor`

## [1.3.0] - 2026-03-26

### Added

- Multi-project management system for scoped MCP exposure
- JSON import modal for quick server registration
- Settings page with backup/restore functionality
- Configuration export endpoint
- Dry-run analysis for configuration imports

### Improved

- Web dashboard UI and UX refinements
- Help text and command documentation
- Tool pagination in dashboard

### Fixed

- Tool schema preservation issues
- Timestamp and timezone display bugs
- Search interaction improvements

## [1.2.0] - Previous Release

For detailed history of earlier releases, see git log.

---

## Guidelines for Future Changes

This changelog is generated from git commits. When committing, use conventional commit format:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation
- `perf:` for performance improvements
- `refactor:` for code refactoring
- `chore:` for maintenance
- `test:` for test additions/changes

Example:
```
feat(projects): add project-scoped MCP access

Allows clients to isolate tool exposure by project name.
```

The changelog will be regenerated from commits using the changelog-generator skill.
