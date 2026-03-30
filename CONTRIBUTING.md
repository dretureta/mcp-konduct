# Contributing to mcp-konduct

Thank you for your interest in contributing!

## Development Setup

```bash
# Clone the repo
git clone https://github.com/dretureta/mcp-konduct.git
cd mcp-konduct

# Install dependencies
npm install
npm install --prefix src/web/client

# Build
npm run build

# Run tests
npm run test

# Run tests with coverage
npm run test -- --coverage
```

## Branch Strategy

- `main` — stable, releases only
- `develop` — integration branch for features
- `feature/*` — work on new features
- `fix/*` — bug fixes
- `docs/*` — documentation improvements

## Conventional Commits

All commits follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add new feature
fix: fix a bug
docs: update documentation
test: add or update tests
refactor: code refactoring without behavior change
perf: performance improvement
ci: CI/CD changes
chore: maintenance tasks
```

Examples:
```
feat(projects): add project-scoped MCP access
fix(logs): resolve null pointer in logRequest
docs(readme): update installation instructions
test(proxy): add tests for SSE transport
```

## Pull Request Process

1. **Fork** the repository
2. Create a branch from `develop`: `git checkout -b feature/my-feature`
3. Make your changes — keep PRs focused and small
4. Add tests for behavior changes
5. Update documentation if needed
6. Ensure `npm run build` and `npm run test` pass
7. Open a PR against `develop`

### PR Checklist

- [ ] Build passes: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] Tests added/updated for new behavior
- [ ] Docs updated (README, CHANGELOG) if needed
- [ ] Commit messages follow conventional commit format
- [ ] No `any` types — use `unknown` + type guard
- [ ] SQL uses prepared statements (no string concatenation)

## Code Standards

See [AGENTS.md](./AGENTS.md) for detailed coding standards:

- TypeScript strict mode
- Prepared SQL statements
- User-friendly error messages
- No `any` — use `unknown` + type guard
- ESM modules with `.js` extension in imports

## Reporting Issues

- **Bug reports**: Use GitHub Issues with the Bug Report template
- **Feature requests**: Use GitHub Issues with the Feature Request template
- **Security issues**: See [SECURITY.md](./SECURITY.md) — do NOT open public issues

## Questions?

Open a GitHub Discussion or use the Question issue template.
