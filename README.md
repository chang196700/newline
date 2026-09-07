# NewLine

[![GitHub Release](https://img.shields.io/github/v/release/chang196700/newline)](https://github.com/chang196700/newline/releases)
[![CI](https://github.com/chang196700/newline/actions/workflows/ci.yml/badge.svg)](https://github.com/chang196700/newline/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Automatically ensures every file ends with exactly one blank line when saved. No more missing newlines or multiple trailing blank lines.

## Features

- **Auto-fix on save** — adds a trailing newline if the file doesn't end with one
- **Cleans up extra blank lines** — if a file ends with multiple blank lines, they are collapsed to a single one
- **Handles both LF and CRLF** — works correctly regardless of the file's line ending style
- **Skips empty files** — files with no content are left untouched
- **Skips whitespace-only files** — files containing only newlines can be ignored (configurable)
- **Manual command** — run `NewLine: Check Newline` from the Command Palette to fix the active file on demand
- **Flexible ignore rules** — exclude files by extension or by regular expression

## Installation

Search for **NewLine** in the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=chang196700.newline) and click **Install**, or run:

```
ext install chang196700.newline
```

## Usage

The extension activates automatically. Every time you save a file, it checks and fixes the trailing newline.

To trigger a check manually, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and run:

```
NewLine: Check Newline
```

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `newline.ignoreOnlyNewlinesFile` | `boolean` | `true` | Skip files whose entire content is only newline characters |
| `newline.ignoreSourceControlledFiles` | `boolean` | `false` | On save, skip Git-tracked files whose ending is unchanged from the staging area |
| `newline.fileExtensionsToIgnore` | `string[]` | `[".conf", ".json", ".liquid"]` | File extensions that should not be modified |
| `newline.fileRegexToIgnore` | `object[]` | `[]` | Regex rules to ignore files by name pattern |

### `newline.fileExtensionsToIgnore`

List of file extensions to skip. The check is a simple suffix match on the full filename.

```jsonc
// settings.json
"newline.fileExtensionsToIgnore": [
    ".conf",
    ".json",
    ".liquid",
    ".min.js"   // you can add any extension
]
```

### `newline.fileRegexToIgnore`

When an invalid regular expression is encountered during a save, NewLine shows a warning identifying the pattern and this setting. Each invalid pattern is reported only once per window session. The invalid rule is skipped; other ignore rules and normal save processing continue without waiting for the warning to be dismissed.

Each entry is an object with two fields:

| Field | Values | Description |
|---|---|---|
| `type` | `"basename"` \| `"fullName"` | Match against the filename only, or the full absolute path |
| `regex` | string | A JavaScript-compatible regular expression |

```jsonc
// settings.json
"newline.fileRegexToIgnore": [
    // ignore any file named exactly "Makefile"
    { "type": "basename", "regex": "^Makefile$" },

    // ignore all files under a "vendor" directory
    { "type": "fullName", "regex": "[/\\\\]vendor[/\\\\]" },

    // ignore all .min.* files
    { "type": "basename", "regex": "\\.min\\." }
]
```

### `newline.ignoreOnlyNewlinesFile`

When set to `true` (the default), files whose entire content consists only of newline characters are left untouched. Set to `false` to strip those newlines as well.

### `newline.ignoreSourceControlledFiles`

Set to `true` to avoid unrelated end-of-file changes in Git-tracked files:

```jsonc
"newline.ignoreSourceControlledFiles": true
```

On save, the current editor content (including unsaved edits) is compared with the Git index (staging area). If the last non-empty line and all trailing newlines are unchanged, NewLine skips the file. Editing that last line, adding content at the end, or changing trailing newlines allows normal newline cleanup. Changes earlier in the file do not trigger cleanup. LF and CRLF are treated as equivalent for this comparison.

The index is the baseline, so staged changes are already part of the comparison version. Newly staged files are also covered. Untracked files continue to use normal newline cleanup. This option requires VS Code's built-in Git extension; other source control providers are not supported. If Git is unavailable, reading the index fails, or the check takes longer than 500 ms, normal cleanup applies.

The manual **NewLine: Check Newline** command still forces a check regardless of this option.

## Issues & Feedback

Found a bug or have a suggestion? Please [open an issue](https://github.com/chang196700/newline/issues).

## Contributing

```bash
pnpm install       # install dependencies (requires Node.js with corepack enabled)
pnpm run compile   # compile TypeScript
pnpm run lint      # run linter
pnpm run test      # compile and run tests (no display required)
```

Commit messages must follow [Conventional Commits](https://www.conventionalcommits.org/) — releases are automated via Semantic Release.

## Releases

The [Release workflow](.github/workflows/release.yml) runs on pushes to `master`
and can also be started manually on that branch. Lint and tests must pass before
Semantic Release runs. Release jobs are serialized to prevent concurrent version
updates.

| Commit | Release |
|---|---|
| `fix: ...` | Patch |
| `feat: ...` | Minor |
| `feat!: ...` or a `BREAKING CHANGE:` footer | Major |
| `docs: ...`, `chore: ...`, `refactor: ...` | No release by themselves |

[`.releaserc.json`](.releaserc.json) controls release generation. Semantic Release
updates `CHANGELOG.md` and `package.json`, builds the VSIX, commits the release
files using `@semantic-release/git`, creates a version tag and GitHub Release with
the VSIX attached, and publishes that package to the VS Code Marketplace. It does
not publish an npm package. Do not manually bump versions or add upcoming version
entries to the changelog; use descriptive Conventional Commits instead.

Repository setup requires a `VSCE_PAT` Actions secret with Marketplace publishing
permission. The workflow uses the automatic `GITHUB_TOKEN` to publish GitHub
releases and push release commits; branch rules must permit these pushes.
Release commits use `chore(release): <version> [skip ci]` to avoid another build.

Run `pnpm run release:dry-run` with GitHub credentials to preview the next release
without generating files or publishing. Marketplace publishing is verified by the
actual release, not by the dry run.

## Credits

Inspired by [vsCodeBlankLine](https://github.com/riccardoNovaglia/vsCodeBlankLine).
