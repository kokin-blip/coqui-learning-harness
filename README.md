# CoquiLearn

A local learning studio for Apple Silicon, macOS 26: adaptive lessons, deliberate practice, a knowledge map and explicit spaced review. Electron, React, TypeScript, Vite and SQLite.

**0.2.2 is an ad-hoc-signed, unnotarized development preview.** ChatGPT teaching, practice, extraction, interactive demonstrations, SVG/PDF/research workflows and logout/browser reconnect have passed without an API key. The signing correction adds resource-seal, nested-code, tamper and DMG/ZIP checks. Chrome-download/Gatekeeper results are recorded separately from application acceptance. Full macOS parity release remains gated on the explicitly open acceptance items; other providers are not represented as live-verified.

## Run and build

Use Node 24+, Xcode command-line tools and an Apple Silicon Mac.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:engine
npm run desktop:dist
```

`npm run build` bundles the React renderer, utility-process learning service, native Apple Vision helper, read-only reader and agent guide. `npm start -- --fixture` exercises deterministic lessons in a separate data directory. `COQUI_EXECUTABLE='/absolute/path/CoquiLearn.app/Contents/MacOS/CoquiLearn' node scripts/acceptance.mjs` tests a package. The final sequential native runner is `scripts/verify-package.mjs`; it includes parity, closure, setup, replacement and profiling lanes.

Ad-hoc-signed arm64 app/ZIP/DMG, corresponding AGPL source and checksums are produced in `release/`. See [installation](docs/implementation/installation.md) and [build-specific verification](docs/implementation/verification.md). Development, packaged and fixture libraries remain separate; LearnHarness data and credentials are not imported automatically.

## Implemented surface

- Diagnostic → dependency plan → teaching, every question variant, committed answers, stable shuffling, numeric confidence, separate reading/answer reasoning, practice outcomes and explicit Next.
- Paginated/searchable Teach/Practice history, keyboard navigation, rename/export/transcript Find, frozen plan snapshots and live pan/zoom focus view.
- Source → chain → proposition browser, ranked search/sorting, full bulk deletion selection, separate 64-concept learning context limit, provenance, stable graph camera/physics/display controls.
- ChatGPT multi-account controls, pending OAuth registration recovery, plan-specific UI and errors; Copilot/Grok subscriptions, external Claude Code, remaining API providers and custom endpoints. Foreground/background consent stays separate; no silent billing fallback.
- Durable input/operation identities, service-generation/event-gap recovery, transactional graph writes, deferred background delivery and interrupted-turn retry without repeated input.
- Previewable text/Markdown/PDF/image imports, per-file selection/results/retry, explicit duplicate choices, source inspection and mixed scanned/text PDF recognition. Explicit FSRS-7 review, separate evidence/corrections, Undo and journaled database/assets/prompt backup restoration.
- Compact glass interface, Moonforest/Dew/system appearance, system typography, optional font/background customization, native zoom ladder and fluid interruptible motion.

## Read local history without opening the app

`npm run history -- --help` exposes session and graph queries. The packaged app includes the standalone reader and [agent guide](skills/coquilearn/SKILL.md). Reads never open credentials, follow referenced files/URLs, execute stored artifacts or write the library.

## Design and coverage

[UI authority](docs/design/ui-direction.md) · [Figma draft](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-137) · [architecture](docs/planning/architecture.md) · [roadmap](docs/planning/roadmap.md) · [233-entry checklist](docs/planning/parity-checklist.csv) · [behavior ledger](docs/planning/completion-checklist.json) · [acceptance procedures](docs/planning/parity-validation.md).

The 233 entries contain overlapping engine/UI requirements, not 233 independent features. Ported code is never counted as a passing acceptance check. Manual VoiceOver/system microphone/clean-Mac installation and user-deferred live providers remain visible in the ledger.

Research: [engine](docs/research/learning-engine.md), [desktop](docs/research/product-desktop.md), [REA](docs/research/installed-app.md), [version reconciliation](docs/research/version-reconciliation.md).

## License and origin

AGPL-3.0-only. Includes code, prompts and tests adapted from Amos Blomqvist's [LearnHarness 0.4.0](https://github.com/amosblomqvist/learnharness/tree/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f), pinned to `dc4c398d5167865b84b0ccb3ec809eb88bf8f65f`. See [LICENSE](LICENSE), [NOTICE](NOTICE) and [origin/adaptation record](docs/implementation/upstream.md). Corresponding source accompanies tester builds; private user reference screenshots and credentials are excluded.
