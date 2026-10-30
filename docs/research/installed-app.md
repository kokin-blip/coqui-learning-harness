# Installed LearnHarness: REA and runtime investigation

Research date: 2026-10-29. Product being planned: **CoquiLearn**, macOS first. This report describes LearnHarness evidence, not CoquiLearn implementation.

## Targets and identity

| Target | Identity |
| --- | --- |
| Installed application | `/Applications/LearnHarness.app` |
| Bundle | `com.learnharness.LearnHarness` |
| Installed version | `0.3.8`, from Info.plist and packaged manifests |
| Native launcher | arm64 Mach-O, SHA-256 `ed42e04a34f3357013a44d24e8aa7127446725b2497f36e50dbab5c336f83eaf` |
| ASAR | `Contents/Resources/app.asar`, SHA-256 `8ff4b4d036faac157dfb7f85b59c6d5ac8044c3037e95b41ec145891fb55dc6b` |
| Packaged Next server | `Contents/Resources/server/standalone/server.js`, outside the ASAR |
| Next build ID | `Dn4kz-mJFG34-24W9iaH0` |
| Reference source | [0.4.0 at dc4c398](https://github.com/amosblomqvist/learnharness/tree/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f) |
| Installed release source | [v0.3.8 at 3dc8847](https://github.com/amosblomqvist/learnharness/tree/3dc88472eea41eed0d5e5f29c2f16f8d063c415b) |

The Info.plist ASAR integrity value is an archive-header integrity value; it is not the whole-file digest above. These values must not be compared as if they represented the same byte range.

## REA evidence ledger

| Evidence | What it establishes | Boundary |
| --- | --- | --- |
| `ev_1e17f66b519364ebd393097835e257960d7213389b72c21109bcc086edba46dd` | Retained complete record of the ASAR analysis operation | Semantic graph coverage is partial; complete-record retention does not imply complete analysis |
| `ev_100e4a845723b1fba2c3cc14d056dc5942fbed2de5fd20e02267672a1c241e2c` | Summary view of that operation, archived locally | Reports observations and resource limitations; static only |
| `ev_6e81484b23720a54b3045a1e1a19c49213fa832a78c97fc3349d038fd83a9931` | First module identity page | Only one page; subsequent pages were also read to select exact assets |
| `ev_b035265b687e7d6169b0ab565084783ecd508d45d0bb7cbc8f06837535895c31` | `electron/main.cjs` external `electron` module-reference role | Not the whole main-process program |
| `ev_eb8ee74e8cbd8c3a1de5f0d20da1200c6a8331c12e3cad433c4511c9af5c788b` | Exact main-process asset identity: 32,953 bytes, SHA-256 `c216c09dc965d9b587867ebf535bf6b1c8db3189ac9398d7e850599e62cfd5d8` | The file node's recorded parse status is partial |

The exact returned summary Evidence is in [installed-asar-summary.evidence.json](../../artifacts/rea/installed-asar-summary.evidence.json). A smaller, explicitly labeled analyst excerpt is [installed-asar-summary.excerpt.json](../../artifacts/rea/installed-asar-summary.excerpt.json). Neither file is the complete parent application graph. A concise selected module record and the native observation errors are saved alongside them. REA's native session was closed after the investigation; re-analysis is needed to recover the session's full graph. The source snapshots and hashes make that reproducible.

REA inspected 296 relevant files, read 2,292,956 text bytes, parsed 228 JavaScript files, visited 170,878 AST nodes, and reported 1,075 findings with zero parser failures. It observed syntax for two BrowserWindow constructions, one preload entrypoint, one exposed context bridge with 28 members, 34 IPC operations, and 13 literal IPC channels. All 21 renderer transmissions had unique literal-channel pairings. These are syntax observations, not runtime execution counts or proof that validation is effective.

The summary reports 389 limitations, 380 application unknowns, and 10,794 semantic unknowns. Vendor relationship expansion hit resource budgets. Per-file static facts were retained where expanded semantic relationships were unavailable. The analysis covered the ASAR desktop shell and bundled dependencies; it did **not** establish complete semantics of the separate Next server or UI bundles. There were no observed native addon bindings in this ASAR analysis; that bounded result is not a claim about the entire app installation.

## How the installed desktop wrapper works

Direct reads of inert shipped files corroborate the following mechanisms. The version report checks these bytes against the release tag.

- Electron main launches the bundled Next server as a child, passes a dedicated data directory and auth-file location, binds it to loopback, and waits for readiness before loading the window.
- The existing app's local server was listening on `127.0.0.1:65535`. Its foreground renderer loaded this HTTP origin. No remote-debugging port was present in the observed process arguments or listeners.
- Main window configuration explicitly enables context isolation and sandboxing and disables Node integration. A narrow preload bridge exposes native features; renderer IPC is paired with main handlers.
- The child server owns the teaching/graph HTTP APIs. The unpacked build manifest lists 32 API route files plus home/new-chat/chat/settings pages. Current 0.4.0 source has 34 API route files; route presence is not a successful-call observation.
- Native menus, zoom, lifecycle, update status, subscription/browser sign-in ownership, and an internal Chromium helper are desktop responsibilities. The server does the learning work.
- The updater uses electron-updater and a GitHub release feed. Staged updates have a revisioned state and install on quit/restart. Readiness or presence of code does not prove a particular update installed successfully.

The packaged server manifest confirms React 19, Next 16.3.2, Pi agent/AI 1.4.0, Motion, Tailwind-related utilities, d3-force, PDF.js, Streamdown/KaTeX/Mermaid, and Radix dependencies. A listed dependency alone is not an implemented feature. The source audit distinguishes direct usage from unused packages.

## Runtime observations

Runtime observation IDs below are analyst ledger IDs, **not REA Evidence IDs**. They refer to this chat's computer-use tool observations. Personal session titles, transcript content, account identifiers, and secrets are intentionally excluded from the report.

| ID | Observed interface | What was established |
| --- | --- | --- |
| R001 | Home | Empty knowledge-map state, notes import front door, teach/practice actions, session search and filters, existing session rows, background-agent area, model and thinking controls, dictation control |
| R002 | Providers settings | 35-provider add-key picker; ChatGPT account selector/manage control; Copilot and Grok connect controls; Deepgram, Tavily, and Brave configuration rows |
| R003 | Agent settings | Strong/Cheap/Vision model and thinking slots; graph tools; MC/free-recall selection; research/demo/visual/PDF toggles; search preference; compaction threshold; visible teacher/prober/shared prompt-fragment controls |
| R004 | Appearance | Disabled Dark mode selector marked “Coming soon”; background hex, reading font/size, serif session names, heading weight, bold/italic colors |
| R005 | Graph settings | Independent extraction and rendering switches, extraction chunk budget |
| R006 | Keyboard settings | Rebind controls, global/chat actions, fixed question-row actions, reset-all control; overrides described as device-local |
| R007 | General settings | Version 0.3.8, release-notes link, manual check and automatic-update preference; no update check was triggered |
| R008 | Existing lesson | Persisted probe answers, correct/incorrect/did-not-know feedback, agent reasoning folds, copy-code controls, pending MC question, “I don't know”, 0–100 confidence slider, learner reasoning field, disabled Submit with no selection, context meter and model controls |
| R009 | Extraction popover | Coverage separates message/token accounting from total transcript history. A diagnostic-only transcript could have many messages and no extractable teacher prose; observed empty map is consistent with this, but no causal extraction run was executed |
| R010 | Navigation restoration | Settings and coverage overlay dismissed; returned to the original home route |

Displayed defaults such as a 4,096-token extraction budget and 150,000-token compaction threshold agree with source defaults. Displayed user preferences are not treated as factory defaults. Merely opening an existing transcript verified its rendered state; it did not validate how its past model responses were produced.

No answers, model turns, key changes, imports, deletions, microphone capture, account connections, or update checks were initiated during these checks. Clicking the editable session title entered rename focus; it was dismissed without editing.

## Runtime limitations and failed probes

REA `observe_native_ui` was attempted against the exact native binary, the existing PID, and its identified main window. With screenshot enabled it returned `screen-recording-denied`; a separate accessibility-only request returned `accessibility-denied`. The tool gave no native observation Evidence record. No permissions were changed and no broad screenshot fallback was used by REA.

Computer-use tools could read the app's accessibility surfaces and initial screenshots through their existing access. Some later screenshot frames lagged the accessibility state; those frames were not used to assert General/settings navigation results. Runtime interface findings rely on the fresh accessibility results where pixels were stale. A full REA CDP/network/static reconciliation could not run because the existing app exposed no CDP endpoint. The app was not restarted to enable debugging.

Packaged Next source-map files inspected contained empty mappings/source arrays. They did not recover the full server source. Release-tag correspondence was checked for selected shell files; it does not prove byte-for-byte identity of all compiled Next chunks.

## Completion and outstanding checks

| Investigation question | Status |
| --- | --- |
| Enumerate current source features and mechanisms | Answered within the pinned checkout; 233 catalog entries across two reports |
| Identify installed artifact/version and shell mechanisms with REA | Answered with partial semantic coverage explicitly retained |
| Reconcile source/release/package differences | Answered for release source differences and selected shipped files; compiled-server identity remains partial |
| Inspect actual app interfaces | Partially answered: home, settings, existing question, coverage |
| Exercise every service and recovery path | Unresolved; requires isolated fixture data, provider access/budgets, microphone flow, generated artifacts, and update fixtures |
| Recommend original CoquiLearn architecture, enhancements, and UI | Addressed by planning docs and editable Figma concept |

See [parity validation](../planning/parity-validation.md) for the controlled runtime cases needed before claiming behavioral equivalence. Exhaustive runtime equivalence has not been established.
