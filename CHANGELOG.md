# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Project-Scoped MCP Access** — Isolate MCP server exposure by project name. Clients can now connect to project-specific tool sets, enabling multi-environment and multi-tenant setups.
- **MCP JSON Server Import** — Register MCP servers directly from JSON configurations. Import from files or URLs without manual CLI input.
- **Settings Backup & Restore** — Export server and tool configurations for backup. Restore with dry-run preview to validate changes before applying.
- **Enhanced CLI Help** — Expanded command examples and practical usage patterns throughout the CLI interface.

### Improved

- **README Structure** — Reorganized documentation with clearer sections, better examples, and improved installation guidance.
- **Web Dashboard** — Added responsive sidebar and global server add context for faster server management.
- **Tool Discovery** — Optimized pagination and loading states for better UX when discovering tools from multiple servers.
- **Timestamp Display** — Logs now normalize timestamps to local timezone for easier debugging and troubleshooting.

### Fixed

- **Tool Schema Preservation** — Downstream MCP tool schemas are now preserved for proper argument validation.
- **Search Interactions** — Improved search field behavior and interaction patterns in the web dashboard.
- **Timezone Handling** — Fixed inconsistent timezone display in logs and timestamps.

### Removed

- Implementation plan and roadmap files (now using changelog-based versioning)

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
