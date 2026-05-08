# [1.0.0](https://github.com/chang196700/newline/compare/v0.0.7...v1.0.0) (2026-05-08)


### Bug Fixes

* **ci:** remove persist-credentials to allow git push in successCmd ([323b2fa](https://github.com/chang196700/newline/commit/323b2fa6f84d2f106a1a70400235af9728c6fc3b))
* **release:** use conventionalcommits preset to support feat! breaking change syntax ([4dd50e0](https://github.com/chang196700/newline/commit/4dd50e011aa1738f1cc65354db598db136e4a1ba))
* remove pnpm version override to use packageManager from package.json ([773c42c](https://github.com/chang196700/newline/commit/773c42c0cae0f2d044fff49a0d0d4e53a7d936f4))

# Change Log

All notable changes to the "newline" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Patch-level releases after v0.0.4 are automatically generated on every push to `master` and are not individually listed here.

## [Unreleased]

### Changed

- Migrated CI/CD from Azure Pipelines to GitHub Actions
- Release workflow now automatically calculates and bumps the patch version on every push to `master`

## [0.0.4] - 2020-07-23

### Changed

- CI pipeline improvements

## [0.0.3] - 2020-04-24

### Added

- Added `newline.fileRegexToIgnore` setting: ignore files whose name matches a regular expression, with support for matching against either the basename or the full file path

## [0.0.2] - 2020-04-24

### Changed

- Updated extension description and documentation

## [0.0.1] - 2020-04-23

- Initial release

[Unreleased]: https://github.com/chang196700/newline/compare/v0.0.4...HEAD
[0.0.4]: https://github.com/chang196700/newline/compare/v0.0.3...v0.0.4
[0.0.3]: https://github.com/chang196700/newline/compare/v0.0.2...v0.0.3
[0.0.2]: https://github.com/chang196700/newline/compare/v0.0.1...v0.0.2
[0.0.1]: https://github.com/chang196700/newline/releases/tag/v0.0.1
