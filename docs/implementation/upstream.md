# LearnHarness origin and adaptations

Origin: Amos Blomqvist's LearnHarness 0.4.0, pinned revision `dc4c398d5167865b84b0ccb3ec809eb88bf8f65f`. The root LICENSE and NOTICE retain its declared AGPL-3.0-only attribution. The source snapshot is the baseline, not the separately installed 0.3.8 binary.

`packages/engine` contains adapted source, prompts, API handlers, Electron connection controllers and relevant original tests. [The manifest](upstream-manifest.json) records SHA-256 for each file that maps directly to the pinned source and whether CoquiLearn modified it. Coqui-only files have no upstream entry. The manifest describes this working tree; no repository commit has been created.

| Area | Adaptation |
|---|---|
| `src/agent`, core tools/prompts | Preserve diagnostic, teaching, question, practice and specialist strategy; route model calls through the retained provider gateway |
| `src/store`, `config.ts` | SQLite records/ordered ledgers and atomic input/recovery intent; transactional graph/deletion/coverage, dedicated resource/data roots; encrypted host-vault adapter replaces auth-file persistence |
| `service.ts`, `routes.generated.ts` | Private Request/Response/SSE adapter in an Electron utility process; durable operation IDs/events; additional evidence/review/import/undo/history APIs |
| `electron/chatgpt*`, subscription controllers | CoquiLearn identity/host ID and vault stores; retain cancellation, refresh, account, entitlement and background policies |
| Claude Code gateway | Preserve external installation and restricted stream/tool bridge; add central background-consent checks |
| `components/session-core.ts`, graph canvas/cluster geometry | Adapt pure session state machine and audited canvas interactions to IPC and Coqui theme/camera; add keyboard zoom/pan and reduced-motion support |
| `components/path-input*` | Retain atomic path chips, controlled plaintext, history/selection/IME behavior in Coqui composers |
| PDF/headless runtime | Explicit Node PDF factories/resources for Electron utility-process detection; parent-owned packaged Chromium verification helper |
| selected `tests` | Keep regression assertions; replace file-store fixtures with SQLite/secret-store seams where needed, update application identity expectations |

CoquiLearn's host, React application, storage/review/import/evidence layer and build scripts are developed here. No automatic LearnHarness data/credential import occurs. Corresponding source accompanies unsigned distribution. This attribution records technical origin; it does not claim authorship of unchanged upstream modules.
