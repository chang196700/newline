# NewLine — Agent Instructions

VS Code extension that ensures every saved file ends with exactly one blank line.
Publisher: `chang196700.newline` · Marketplace: https://marketplace.visualstudio.com/items?itemName=chang196700.newline

## Key Files

| File | Purpose |
|------|---------|
| `src/extension.ts` | Activation entry point, registers command and event listener |
| `src/newline.ts` | Core `NewLine` class — all trailing-newline logic lives here |
| `package.json` | Extension manifest, contribution points, scripts |
| `.releaserc.json` | Semantic Release config (branches, plugins, VSIX publish) |

## Build & Test

```bash
pnpm install          # install deps (uses corepack pnpm@11)
pnpm run compile      # tsc → out/
pnpm run lint         # eslint src/
pnpm run test         # requires a display (CI sets DISPLAY=:99.0 via Xvfb)
pnpm run package      # produces dist/newline-<version>.vsix
pnpm run release:dry-run  # semantic-release dry run
```

## Release Process

Releases are fully automated via [Semantic Release](.releaserc.json) on every push to `master`.
Commit messages **must** follow [Conventional Commits](https://www.conventionalcommits.org/):
- `fix:` → patch version
- `feat:` → minor version
- `BREAKING CHANGE` in footer → major version
- `chore:`, `docs:`, `refactor:` → no release

## Architecture

- `NewLine` class hooks `onWillSaveTextDocument` to run synchronously before save using `waitUntil`.
- Logic counts trailing EOL sequences (`\n` or `\r\n`) and emits a single `TextEdit` to normalise to exactly one.
- Ignore rules checked in `checkFileExtNeedIgnore()`: extension suffix match first, then regex rules (`basename` or `fullName` mode).
- Configuration namespace: `newline.*` (see [README.md](README.md#configuration) for all settings).

## Conventions

- **No runtime dependencies** — `package` script uses `--no-dependencies`; `node_modules` excluded via [`.vscodeignore`](.vscodeignore).
- **Exact pinned devDependency versions** (no `^`) for `@vscode/vsce` and semantic-release packages.
- `engines.vscode` and `@types/vscode` must stay in sync; bump both together manually.
- `mlib/` is a vendored C header library — **do not modify**, excluded from VSIX.
