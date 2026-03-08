# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] - 2026-03-08

### Changed
- Switch to npm Trusted Publishing (OIDC) for automated releases

## [0.3.0] - 2026-03-08

### Added
- Answer caching — wizard remembers previous answers between runs (`--no-cache` to disable)
- Lifecycle hooks — `onBeforeStep` and `onAfterStep` callbacks in `RunWizardOptions`
- Dynamic options — load select/multiselect/search options from external JSON/YAML files via `optionsFrom`
- Template save/load — save wizard answers as named templates, reload with `--template <name>`
- `grimoire cache clear` command to reset cached answers
- `grimoire template list` and `grimoire template delete` commands
- `--no-color` / `--plain` flag for CI and accessibility
- `--renderer ink` flag for enhanced TUI rendering with box-drawing and progress bars
- Banner / figlet ASCII art wizard header with gradient colors
- Selection cache with MRU (most-recently-used) ordering for select/multiselect/search steps
- E2E integration tests covering all example configs and CLI flags (204 total tests)
- GitHub Actions publish workflow — auto-releases on version bump push to main
- Issue templates for bug reports and feature requests

## [0.2.0] - 2026-03-08

### Added
- Config-driven wizard engine with YAML and JSON support
- 11 step types: text, select, multiselect, confirm, password, number, search, editor, path, toggle, message
- Conditional branching with 8 operators (`equals`, `notEquals`, `includes`, `notIncludes`, `greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`) plus compound conditions (`all`, `any`, `not`)
- Route-based navigation — select steps can branch to different step sequences
- Back-navigation with history stack
- Step groups with visual section headers
- Visual progress bar with step counter
- Theming with 7 semantic color tokens and 4 icon overrides
- Structured output in JSON, YAML, and `.env` formats
- Config inheritance via `extends` keyword
- Pre-flight checks — run shell commands before wizard starts
- Post-wizard actions — run shell commands after completion
- Plugin system for custom step types
- `$ENV_VAR` resolution in default values
- Async validation hook for API calls and file system checks
- Template interpolation with `{{stepId}}` placeholders
- Cycle detection in step graph
- `grimoire run` with `--dry-run`, `--mock`, `--json`, `-o`, `-f`, `-q` flags
- `grimoire validate` for config validation
- `grimoire create` interactive scaffolder
- `grimoire demo` showcase command
- `grimoire completion` for bash, zsh, and fish shells
- `defineWizard()` type-safe config builder
- Full programmatic API with all engine functions exported
- JSON Schema for IDE autocomplete
- 119 unit tests across 7 test files
- CI workflow testing Node.js 18, 20, and 22
- 11 example configs including real-world recreations
- Comprehensive README with full API documentation

## [0.1.0] - 2026-03-07

### Added
- Initial project setup
- Core engine with step navigation
- Basic step types: text, select, confirm
- YAML config parsing

[Unreleased]: https://github.com/YosefHayim/grimoire/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/YosefHayim/grimoire/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/YosefHayim/grimoire/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/YosefHayim/grimoire/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/YosefHayim/grimoire/releases/tag/v0.1.0
