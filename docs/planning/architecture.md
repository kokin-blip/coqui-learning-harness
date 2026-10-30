# CoquiLearn architecture

Implemented preview architecture, 2026-10-29. The approved target is Apple Silicon/macOS 26, local use, unsigned distribution. This replaces the earlier recommendation-only document.

## Workspace and processes

One npm lockfile covers `apps/desktop`, `packages/engine`, `packages/storage` and `packages/contracts`.

| Process | Ownership |
|---|---|
| Electron main | Windows, menus, trusted file dialogs, OS-protected credential vault, account connections, host services |
| Sandboxed React renderer | Packaged Vite assets, navigation, lesson/practice UI, graph, settings, review, import previews |
| Node learning utility process | Adapted engine, private route adapter, SQLite records, inference, extraction and background delivery |
| Chromium helper | Unprivileged hidden Electron browser for verification; private parent-owned lifetime |

No Next.js server or renderer HTTP API listener is required. The engine's original Request/Response routes are compiled behind private IPC. Typed contracts and the preload expose requests, host actions and subscriptions; Electron checks the owning main frame. Secrets are omitted from renderer projections. The utility process receives only the secrets needed by its engine adapters.

## Durable records

Node's built-in SQLite stores native chat messages, jobs, ordered graph assertion ledgers, settings, operation results, event sequences, evidence, review cards/logs and tombstones. WAL and synchronous FULL are enabled; nested writes use savepoints. CoquiLearn uses separate packaged/development/fixture roots and preserves the upstream future-schema guards. No automatic LearnHarness migration occurs.

The adapted engine persists learner input before inference, commits authored question answers before presentation, preserves stable question identity/shuffling and refuses stale answers. Mutating IPC commands have operation IDs plus payload fingerprints: exact retries return the saved result; reused IDs with a different command conflict. An unresolved operation after interruption is reported as uncertain, not blindly repeated. Push events carry persistent sequence numbers; the UI refetches committed snapshots on resync.

Graph merge and source coverage commit together. Durable job completion and pending-delivery records remain separate, so a completed result can be delivered after restart without rerunning its inference. Source deletion keeps shared assertions according to the chosen policy; soft-deletion snapshots support Undo without overwriting newer work.

## Evidence, review and imports

Learning evidence records attempts, thinking, confidence, hint/outcome information and feedback provenance separately from graph assertions. Corrections are separate records. Graph size and lesson-plan position are not mastery scores.

`ts-fsrs` v6 uses FSRS-7 at 90% desired retention, learning steps 1m/10m, relearning 10m, fuzz disabled. Cards are explicitly added; retrieval is explicitly rated Again/Hard/Good/Easy. Scheduler version and logs are stored; confidence never chooses the rating.

Previewable text/Markdown/PDF/image imports retain content identities and source anchors. Native Apple Vision provides on-device OCR for image previews; unavailable recognition leaves a visible per-file result. Original assets are content-addressed. Committing a library import and extracting it into the graph are separate actions.

Backup capture uses a consistent SQLite VACUUM INTO snapshot plus assets/prompts and a versioned, hashed manifest. Credentials are excluded. Restore validates integrity/schema/archive paths before replacing live records, and the main process creates a recovery backup first.

## Connections and generated content

Electron main owns ChatGPT, Copilot and Grok connection controllers, cancellation, account state and encrypted vault persistence. The learning process receives safe leases through private host requests. Claude Code remains the user's unmodified external installation and owns its login; opt-in and background consent are explicit. API keys and custom endpoint credentials use the same host-owned vault. Real environment keys retain precedence. Subscription failures do not fall back to API billing.

Generated SVG stays in an image boundary. HTML demonstrations use a separate nonce-addressed protocol in an opaque-origin, scripts-only sandbox without preload, Node or parent access. The display policy restricts remote dependencies to approved CDN origins. The engine verifies final authored bytes through the separate Chromium helper before delivery. Native fixtures exercise basic execution and isolation; dependency/network compatibility and live generation remain release checks.

## Interface and motion

React/Motion implements the approved Moonforest/Dew glass world with macOS system typography. Native under-window vibrancy supports translucent CSS Canopy/Lens/Mist surfaces; this is a glass interpretation, not SwiftUI Liquid Glass. Reading text stays stable. The current compact composition supersedes the earlier floating Figma shell: 52px destination rail, 236px session sidebar, 44px title bar, centered reading column, anchored composer and one inspector.

Shared selection uses retargetable springs; panel/hover/press feedback is restrained. Reduce Motion and Reduce Transparency have working fallbacks. The graph reuses the audited Canvas/d3 interaction renderer, stable layout and camera, with responsive list/chain alternatives. The packaged 60Hz streaming/graph benchmark and manual VoiceOver assessment remain open; measured fixture results are in the verification report.

## Distribution

Unsigned arm64 ZIP/DMG, manual version check and application replacement. Developer ID/notarization and automatic installation are deferred by the approved plan. Intel, Windows, Linux, iOS and synchronization are later work.
