# Upstream synchronization — 2026-10-16

Merged upstream `maxprograms-com/Swordfish` master at `6e0aa95` (5.28.0), including all nine commits missing from the fork. SwordfishEdu retains its identity and 1.1.0 package version; the upstream engine identifies itself as 5.28.0.

## Integration choices

- Preserved training, ATA/CATTI scoring, streaming reports, AI Tutor, GLM/Doubao/DeepSeek providers, Agent CLI and ten style profiles.
- Added upstream Ollama settings/provider alongside the custom providers; tag-fixer selection remains mutually exclusive across all providers.
- Accepted upstream XLIFF/SQLite/format-catalog updates, repeated-segment navigation, document-name metadata, GlossML import, and updated dependencies.
- Retained Node HTTP for loopback backend calls (avoiding application proxy handling), with UTF-8 streaming decoding and upstream response error handling.
- Updated Agent compilation to Java 25. Kept checked-in application icons despite upstream ignoring the generated build directory.
- Normalized both paths when persisting project-relative XLIFF paths. New OpenXLIFF path handling otherwise produced incorrect paths on macOS when `/var` and `/private/var` aliases were mixed.
- Kept local score-report styling in a separate commit before merging. Local Claude permission settings and packaged application artifacts are not part of this synchronization.

## Validation

- Java 25 backend and TypeScript compilation.
- 20 SQLite behavior checks: revision conflicts, locks, tags, confirmation state, history, undo, atomic rollback and Unicode.
- Real embedded Java runtime + HTTP + CLI: read, validate, apply, reread, history, undo, authentication and editor-occupation checks.
- TMX export includes confirmed translations and excludes Agent drafts; project paths remain portable after statistics updates.
- Ten style profiles resolve offline, including language/content scope and separate Red Hat licenses.
- Isolated Electron 44 renderer smoke: custom providers + Ollama + Claude preferences present, tag-fixer exclusivity, ten styles in AI Tutor, no renderer errors. No external model was called.

Full end-user GUI workflows, live AI scoring quality, proprietary customer packages and new installer delivery are outside these checks. No DMG/release was published.
