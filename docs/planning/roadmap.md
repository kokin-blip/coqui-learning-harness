# CoquiLearn completion roadmap

Updated 2026-10-30 for 0.2.1. The pinned LearnHarness baseline remains 0.4.0 `dc4c398`. The [233-entry CSV](parity-checklist.csv), [behavior ledger](completion-checklist.json) and [executed evidence index](parity-evidence.json) distinguish contract, prompt-policy, native UI, live service and manual acceptance. Subordinate assertions do not inflate feature counts.

The requested remaining-work items 1–3 are complete: the 151 partially evidenced entries have reviewed contract bindings and completed implementation fixes; the ChatGPT live lane includes browser reconnect and specialist workflows; persistence/Undo/large-history/backup failure cases are hardened and exercised. Other providers' live testing is explicitly deferred by the user to friends after release.

| Milestone | Implemented and evidenced | Remaining gate |
| --- | --- | --- |
| 1 — Accurate checklist | All 233 entries have concrete code and V001–V039 procedures; 189 automated, seven prompt-policy and eight ChatGPT-live closures; 12 fixture-verified/user-deferred live entries | 14 manual acceptance rows remain explicit; no code-presence-only closures |
| 2 — Primary ChatGPT path | Registration, identity, vault/accounts, account catalogs, roles, plan UI/errors and deterministic lifecycle cases; live teaching, practice, extraction, demo, SVG, PDF, primary-URL research, logout/browser reconnect and restart; final-package inference | Other services remain available but live-unverified by user choice; refresh/quota/races are deterministic evidence |
| 3 — Learner-facing parity | History/filters/search, immutable/live/focus plans, chains/provenance/selection, rich rendering, activity/imports, persistent Undo history, figure focus/inversion, compaction gate and complete practice metadata | Manual accessibility/native UI acceptance is separate from the 62 named packaged runtime/parity/closure/setup checks |
| 4 — Durability/upgrades | Atomic input/recovery intent, operation IDs/cursors/generations, transactional graph/coverage/deletion, durable outbox, restartable overlapping shared-source Undo, 1,000-session histories, search cleanup, staged journaled backup/restore, FSRS/evidence/imports | Nine real SIGKILL boundaries and corruption/rollback/replay tests pass; no claim of every theoretical interleaving |
| 5 — Unsigned distribution | 0.2.1 arm64 app/ZIP/DMG, AGPL source/checksums/build report; isolated ZIP install/manual 0.2.0→0.2.1 replacement passes; packaged streaming/1,000-proposition profile recorded | Clean macOS installation, manual VoiceOver/microphone/native cases before a full parity release |

## Accepted defaults

Electron + React + TypeScript + Vite, npm workspaces/one lockfile, Node utility-process engine and SQLite stay fixed. Main owns native windows, menus, file grants and encrypted credentials. Backups include database/assets/prompt overrides and exclude credentials. Development/fixture/production libraries remain separate; no LearnHarness data is imported automatically.

Preserve the approved compact desktop layout, glass, system font, Moonforest/Dew and interruptible damped-spring motion. Optional customization must retain readable defaults. Standard Tab and conflict detection, numeric confidence, recoverable deletion and content-addressed imports are approved improvements. Confidence, corrections, domain graph knowledge and explicit FSRS review grades remain separate.

Subscription failures preserve work and never silently switch to API billing. Copilot, Grok, Claude Code, search, dictation, API providers and custom endpoints stay in scope; unavailable accounts limit live evidence. Do not update Claude Code automatically or spend on API inference. The first target remains unsigned Apple Silicon/macOS26 with manual replacement; signing/auto-installation, Intel, other platforms, iOS, local models, sync and advanced calibration follow later.

## Current release boundary

The runnable 0.2.1 preview passes 1,462 adapted engine assertions, 54 Coqui assertions, 62 packaged runtime/parity/closure/setup checks and three isolated bundle-replacement checks. The five-second graph/stream profile recorded no frame intervals above 16.7 ms or long tasks. Exact payload, actual measurements, provider scope and limitations are in [verification](../implementation/verification.md). Full release readiness still requires the remaining manual checks; factual and learning-effectiveness claims require independent evaluation.
