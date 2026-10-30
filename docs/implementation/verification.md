# CoquiLearn 0.2.1 verification

Tested working tree, no Git commit. Reference: LearnHarness 0.4.0 `dc4c398d5167865b84b0ccb3ec809eb88bf8f65f`. Apple Silicon/macOS 26.6.1 (25G76), Electron 44.10.0, packaged Node 24.22.1, source Node 24.15.0. Unsigned development preview; this report does not label unperformed manual checks as complete.

Final application payload SHA-256: `b1bb6f098e7b4f70a9a0ef77ae9c73d9e366ef8b5e273757d2da8aeaaf468453`. The four packaged acceptance reports and motion report record this same hash before testing. The final live smoke also records it.

## Requested closure batch

1. The 151 entries previously marked partially evidenced were reviewed against the actual application, with concrete gaps fixed and executed assertions bound to the applicable contracts. The 233-entry catalog still contains overlapping engine/UI requirements. [Evidence index](../planning/parity-evidence.json), [CSV](../planning/parity-checklist.csv), [behavior ledger](../planning/completion-checklist.json).
2. The ChatGPT live lane now includes logout/browser reconnect, SVG render/vision inspection, local PDF extraction/render/page citations and primary-URL research, in addition to teaching, practice, extraction, interactive demonstration and restart. The user explicitly deferred other providers' live testing to friends after release; those connections remain available.
3. Hardening adds real process-death tests, atomic input/recovery intent, transactional deletion/Undo, shared-source ownership, large histories, search cleanup and verified atomic backup export. No claim is made that a finite suite covers every possible failure ordering.

## Executed checks

| Check | Result | Evidence |
| --- | --- | --- |
| TypeScript | Pass | `npm run typecheck` |
| Coqui storage/contracts/imports/readers/recovery/presentation | 54 passed, zero failed | `npm test`; `artifacts/implementation/coqui-tests.tap` |
| Adapted engine regression | 1,462 passed, zero failed suites | `npm run test:engine`; `upstream-suite-summary.log`, `tests/*.log` |
| Packaged runtime/recovery | 21 checks passed | `packaged-acceptance.json` |
| Packaged question/plan/chain/import parity | 19 checks passed | `parity/acceptance.json` |
| Packaged closure | 19 checks passed | `closure/acceptance.json` |
| Clean-account setup | 3 checks passed | `setup-acceptance.json` |
| ZIP installation/manual replacement | 3 checks passed, 0.2.0→0.2.1 | `distribution-acceptance.json`; same Mac, temporary Applications directory, not a clean-machine result |
| Visual extension | 9/10, ship within four added controls; no material fixes | `docs/design/closure-finish-review.md`, `closure-extension-evidence.md`; Moonforest/Dew/narrow captures |
| Packaged graph/stream profile | 1,000 propositions, 333 implication nodes, scripted stream active | `performance/streaming-graph.json` and trace |
| Final live ChatGPT response and saved demo | Plan inference settled; Add/Reset and iframe isolation passed | final 0.2.1 entries in `chatgpt-live-session.jsonl` |

Artifact paths above are relative to `artifacts/implementation/` unless explicitly prefixed. `scripts/verify-package.mjs` runs the native lanes sequentially. The polling helper now awaits asynchronous IPC predicates instead of treating an unresolved Promise as success. All affected package checks were rerun after this correction. Loopback-provider fixtures and Apple Vision tests require native host access; sandbox-denied attempts were not counted as passing evidence.

## Fixed and exercised

Input and its running/recovery intent now commit in one SQLite transaction. A death immediately after write-ahead persistence recovers an explicit Retry with one learner message. Sibling answers retain provider adjacency and only the final answer starts a reaction. Session reattachment uses committed cursors/service generations separately from transient stream ordering. A transient record-read error retains the visible lesson and draft.

Deletion captures its tombstone, mutates records/graph/jobs and finalizes Undo in one transaction. Rollback covers failed session deletion. Ownership markers prevent an earlier Undo from resurrecting a later independent deletion. Deferred chains and positions recover when their remaining endpoints/sources return, including after restart; newer edits win. A 1,000-session library with repeated deletions checks history, search and Undo. Concept/source deletion also removes stale FTS entries while retaining shared-source wording.

Nine actual SIGKILL cases cover graph node/chain/coverage writes before commit, after graph commit, input persistence, worker completion before delivery, and restore journal boundaries prepared/old-moved/new-installed. They retain the committed graph or honest uncovered state, recover one delivered result, and recover the previous database/assets/prompts as a coherent library. Additional corruption, future-schema, path traversal, missing/undeclared asset, import-limit, mixed/scanned PDF, unavailable OCR, partial import and fixed-clock FSRS tests pass.

Backups validate a staged restore before export. Native saving writes and syncs a temporary archive, atomically replaces the destination and syncs its directory. Credentials remain outside backups. Restore still validates/stages, quiesces, journals, switches, restarts and verifies with rollback.

The closure UI exercises saved probe assessment and automatic teacher handoff; silent practice dismissal and explicit Next; recorded practice mode/target/rung/miss/retest details; compaction's visible answer gate and full-history export; deferred research/SVG results across restart; actual background cancellation/failure; natural-size isolated SVGs with persistent inversion and focus controls; path-only native File drops; context picker Done; and native graph keyboard pan, wheel zoom, camera restore and persisted node drag.

Usage presentation distinguishes known API estimates, plan use and unavailable prices, including mixed plan/unpriced stages. An unknown price is never displayed as $0. Claude's context denominator uses the latest matching CLI-reported effective window; absent/stale metadata remains unknown. The polished system font, compact layout, themes, glass and motion remain intact.

## Live provider evidence

The user completed system-browser sign-in and reconnect consent. Account-available `chatgpt:gpt-6.1-sol` filled explicit compatible Strong/Cheap/Vision roles. No API key was configured for these acceptance calls and no paid fallback was used.

- A short equality lesson ran diagnostics, goal clarification, saved assessment, automatic teacher handoff, a dependency plan, explicit learner agreement, derivation and a check. Numeric confidence and separate thinking channels persisted.
- A real practice problem concluded with its originally committed solution and paused for explicit Next. Lesson and practice survived restart.
- Extraction completed four eligible passages, yielding three propositions and one chain, with durable completion and honest coverage.
- An interactive equality demonstration passed builder execution/verification and one durable delivery. Final-package Add and Reset controls work; Node and Coqui preload are absent from the opaque iframe.
- Static SVG work used write/render/vision inspection and durable delivery. The PDF specialist extracted one cited fact per page of a three-page local fixture and rendered page 1. Research fetched a supplied primary RFC URL without a search key and returned a cited brief. Each job completed and delivered.
- Explicit logout removed account models and refused inference before persisting new input. Browser reconnect restored the account catalog and the exact committed history and unsent draft. The working account remains connected.
- A fresh response in final 0.2.1 settled successfully using the ChatGPT plan, without a question or background job.

Evidence: `chatgpt-live-connection.json`, `chatgpt-live-reconnect.json`, `chatgpt-live-session.jsonl`, `chatgpt-live-demo.png`, `provider-verification.json`. Earlier failed/partial attempts remain in sequence. The main-owned encrypted vault is excluded from evidence and source archives; private model thinking is omitted.

| Route/service | Executed fixture/contract evidence | Live status |
| --- | --- | --- |
| ChatGPT | Registration before exchange, callback/PKCE/identity/scopes, refresh, cancellation, account/race/catalog/background/error/terminal-stream cases pass | Completed teaching/practice/extraction/demo/SVG/PDF/research/reconnect/restart plus final 0.2.1 smoke |
| Copilot/Grok | Device/browser/manual prompts, cancellation, refresh, catalogs/stream/consent and packaged controls pass | Deferred by user; no account claimed verified |
| Claude Code | Opt-in/version detection, native transcript/stream, restricted tool bridge, context/reuse/abort fixtures pass | Deferred by user; installed 2.1.241 below required 2.1.259, unchanged |
| API/custom endpoints | Catalog/key boundaries, local mock discovery/lifecycle/revision/capability/redaction pass | External API inference deferred; no metered calls |
| Search | Key selection/pins, errors, fetch, PDF and limits pass | Primary-URL research passed; Tavily/Brave delivery unverified without keys |
| Dictation | Simulated grant/denial, stop/flush/cancel, reconnect, language/preferences pass | Physical mic/Deepgram roundtrip remains unverified without service key |
| Apple Vision OCR | Native recognition and mixed/scanned PDF recognition pass | On-device helper executed; no cloud service |

Prompt doctrine is tracked as policy parity with composition assertions and bounded live examples, not empirical learning efficacy. See [prompt-policy review](prompt-policy-review.md).

## Motion sample

The final package streamed a scripted native response while interacting with the 1,000-proposition graph. Across 601 intervals: median 8.3 ms, p95 9.8 ms, maximum 10.4 ms; none exceeded 16.7 ms. Trace union of main-thread JS/GC/event/style/layout/paint work between 600 RAF markers: p95 1.515 ms, maximum 4.872 ms. Eighty keyboard samples measured native-event-to-handler delay: median 0.2 ms, p95 0.4 ms, maximum 0.5 ms. No long tasks were observed. Sample-end JS heap was about 18.9 MiB; process working-set snapshots are retained.

The display refreshes above 60 Hz; this is not a locked-60-Hz or live-provider-throughput benchmark. No compositor/GPU dropped-frame counter was emitted. Estimated missed display frames were zero; actual GPU drops remain unmeasured. The five-second sample does not establish long-term memory behavior or larger-graph performance.

## Remaining release boundary

The ledger records 189 automated contract closures, seven prompt-policy closures, eight ChatGPT live closures, 12 fixture-verified/user-deferred live entries, 14 manual acceptance entries, one deferred web/dev entry and two approved distribution differences. These are overlapping catalog rows, not independent feature counts.

The requested implementation/ChatGPT/hardening batch is complete. Manual keyboard/VoiceOver/native lifecycle/permissions/typography/motion acceptance and clean-Mac installation remain separate release gates. Other providers remain available for the user's planned friend testing. No applicable functionality is knowingly omitted within the completed batch, but unperformed manual or external-service checks are not called verified. Signing, automatic installation, Intel, other platforms, iOS and synchronization remain approved later scope.
