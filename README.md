# NewLine

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/chang196700.newline)](https://marketplace.visualstudio.com/items?itemName=chang196700.newline)
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

## Issues & Feedback

Found a bug or have a suggestion? Please [open an issue](https://github.com/chang196700/newline/issues).

## Credits

Inspired by [vsCodeBlankLine](https://github.com/riccardoNovaglia/vsCodeBlankLine).
