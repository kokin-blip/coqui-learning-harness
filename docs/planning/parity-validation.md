# CoquiLearn parity validation plan

Scope: **macOS first**, with all identified LearnHarness source features retained in the backlog. This is the retained acceptance strategy. A runnable implementation and bounded fixture results now exist; see [actual verification](../implementation/verification.md). The cases below are not all complete.

The [parity checklist](parity-checklist.csv) contains **233 tracked entries**: E001–E122 from the engine audit and U001–U111 from the product/desktop audit. UI and backend facets intentionally overlap. It records source behavior and implementation evidence; CoquiLearn may use different internals where observable capability, durability, controls, and honest limitations remain equivalent. Source-specific class names, localStorage keys, styling, and bugs are evidence of the reference implementation, not a requirement to duplicate its branding or defects.

| Milestone | Planned rows | Validation focus |
| --- | ---: | --- |
| M1 Core lesson | 113 | macOS local runtime, basic model/key setup, diagnostic/plan/teaching/practice loop, questions, durable sessions, navigation, streaming/recovery, core input and accessibility |
| M2 Knowledge and agents | 91 | Graph/chains/provenance, extraction and coverage, jobs/delivery/recovery, imports, files, generated demos/figures/PDFs, related UI and costs |
| M3 Integrations and release | 29 | Full providers, custom endpoints, subscriptions, Claude Code, dictation, prompt controls, key rebinding, appearance polish, signed release/update paths |

The M1–M3 table below preserves the original audit grouping; the approved Stage0–5 subscription-first sequence in [roadmap](roadmap.md) now owns delivery order. The checklist has updated stage assignments and evidence statuses. The milestones mark the macOS delivery target for each row. U098/U100/U101/U105/U109 explicitly retain later Windows/Linux behavior; they cannot be labeled fully cross-platform verified after only a macOS test. U094 explicitly remains **future web/dev parity after macOS**; its same-origin subscription path is retained rather than silently dropped. iPhone/iPad support is a future platform goal, not an implied completed parity claim. U089 records the reference's unfinished visible light-mode control; working light mode is an additional CoquiLearn feature if implemented.

## Evidence and completion rules

For each checklist entry, retain the tested CoquiLearn commit/build, source-baseline commit/version, environment, fixture or sanitized steps, expected/actual result, and a relevant screenshot/trace/assertion. When the source has a prompt rule rather than an enforced state rule, record both deterministic protocol results and model-adherence evaluation. A scripted agent cannot prove that a live model follows pedagogy or that learners retain knowledge.

Use fixture-driven tests for state transitions, grading, providers, jobs and storage; real browser/Electron interaction for focus, scroll, drag, rendering and permissions; and staged packaged builds for native lifecycle, signing and updates. Use isolated test data/auth roots, recorded/fake provider streams and disposable source files. Live service tests are a separate bounded lane requiring configured services and a known usage budget. Do not record API keys, access tokens, raw microphone recordings or unrelated learning history as evidence.

CSV statuses distinguish verified-automated, verified-prompt-policy, verified-chatgpt-live, fixture-verified-live-deferred-by-user, manual-acceptance-pending, accepted-deviation and deferred. The 0.2.1 evidence index records authored case bindings and actual assertion names. Previously partial entries were reviewed and concrete gaps fixed before closure; ported modules alone do not close a contract. Prompt-policy verification establishes shipped/composed instructions and bounded observations, not consistent pedagogy or empirical outcomes. Other providers' live tests are explicitly deferred by the user, while their implementations remain available. Manual checks remain pending.

Apply accepted decisions in the [roadmap](roadmap.md) when translating source checks into CoquiLearn behavior: standard Mac focus/collision handling, recoverable deletion, numeric confidence, transactional storage/readers, functional themes, and IPC rather than loopback HTTP. These are accepted design differences; implementation evidence is recorded separately. Source-defined key names, file formats, endpoints and deletion mechanics do not override the proposed architecture.

## M1: core lesson and durable interaction

| Case | Script and expected result | Coverage |
| --- | --- | --- |
| V001 First launch and retained draft | Launch clean macOS install with no models/keys; write a long draft and attempt Send. Setup opens before creating a session, draft remains exact, and Save does not auto-send. Configure a basic supported provider and model, then send once. Rapid double-send creates one session. | E001–E003, E108, E115–E116; U004–U005, U076–U077, U079, U097 |
| V002 Session model ownership | Create session A with model X; change global Strong to Y; create B and reopen A. A remains X, B is Y. Change A's thinking preference and select reasoning/nonreasoning models; only supported levels are used and missing model/key state is explicit. | E003, E107–E109; U081–U083 |
| V003 Diagnostic-to-teaching handoff | Script clarification, probe question/answer, structured strand assessment, successful probe_done and teacher plan. Attempt probe_done while a question is open and after success. Confirm one successful handoff, exact assessment and correct phase sequence after reload. Inject delivery failure and confirm next learner action resumes from the recorded seam. | E005–E011, E015; U003, U008, U035, U040, U048 |
| V004 Plan authoring and revision | Submit a valid DAG, invalid endpoint/self-loop/cycle/slug fixtures, then rewrite. Confirm repairable errors, latest structure with historical snapshots, and status derived from A,A,B,A question-call positions rather than answer correctness. Open each plan view and fit/pan/zoom it. | E019–E023, E031; U047 |
| V005 Choice question contract | Pose single/multiple-choice questions with deterministic shuffled options; reload before answering. Test exact answer keys containing punctuation, extra/missing selections, invalid authoring, and Don't know. Confirm correct deterministic verdict, stable ordering, confidence stop behavior, and no synthetic answer saved before response. | E024–E028, E031, E033, E036, E038; U040–U043, U045 |
| V006 Free recall and ungraded questions | Switch mechanics; pose a free-recall question and Ask variants. Confirm original answer commitment is hidden before submit and revealed after; next model context includes learner words without a client-authored free-text grade. Other/multi-select/text Ask responses remain ungraded. | E024, E029–E030, E035; U040–U041, U045 |
| V007 Reading and answer reasoning | Pose prediction then teaching check. Prediction arrives open; check waits for reveal. Enter different thoughts before reveal and during answering; reload/switch question and confirm chronology, distinct channels and per-call draft scope. Toggle all thinking. | E013, E032–E035; U043–U046 |
| V008 Practice arc and pause | Start Practice from turn one; pose each demand mode with hidden committed solution. Send several traces, reject second active problem and inactive conclude, conclude with full metadata, ask a follow-up, then explicitly Next. Verify practice never writes extraction/graph coverage. | E039–E049; U003, U050–U052 |
| V009 Send, steer, stop and layered dismissal | While a slow response runs, send a steer and then pose a question; confirm one boundary delivery or retained parked steer. Exercise Enter/Shift+Enter/Cmd+Enter, Stop, question skip, problem dismissal and Escape with stacked menus/overlays. One keypress causes one topmost action; dismissal fabricates no answer. | E016–E018, E097, E099; U036–U040, U049, U067, U069–U070 |
| V010 Reattach and two-view race | Submit a slow turn, leave session, return and attach a second window. Computation continues; both adopt committed native history without duplicate cards. Race two starts: one wins and one gets 409. Simulate sibling parallel questions; only final answer starts one reaction turn. | E005, E037, E097–E099, E104; U035, U073 |
| V011 Compaction and retained archive | Use a long fixture crossing configured/model-window thresholds. Confirm summary+safe kept-tail projection, no concurrent model work for that chat, visible send gate and divider, no recompact churn, usage attribution, and original export/history retention. Fail summary and retry. | E105–E106, E119; U012, U048, U086 |
| V012 Navigation and readable transcript | Create both session kinds, filter/search/list, quick-open by keyboard, literal Find regex-like text in streamed prose, rename and export. Confirm correct focus, wrapping search, draft preservation and bottom-follow suspension during evidence navigation. Stream code/tables/CJK/math and exercise raw-source copy. | E001–E002, E015, E119; U007–U014, U036–U039, U053–U054 |
| V013 macOS host boundary | Launch app twice, close last window, activate Dock, quit and relaunch. Confirm one instance, recreated window, child cleanup, isolated dev/installed data and private utility-process backend. Attempt foreign API/navigation/permission access and check capability rejection/no redirect leakage; renderer cannot use Node directly. | E097–E099, E118; U098–U104, U106, U110 |
| V014 Core accessibility and motion | Complete creation, questions, plan and Practice with keyboard only and VoiceOver. Check focused overlay trapping/return, input labels, state announcement, readable text/contrast, 200% app zoom and narrow window. Test Reduce Motion for every programmed movement rather than CSS alone. | U007, U036–U048, U067, U069–U070, U101, U106, U111; CoquiLearn glass UI acceptance |

## M2: knowledge, sources, jobs, and media

| Case | Script and expected result | Coverage |
| --- | --- | --- |
| V015 Incremental extraction | Mix assistant prose, question blocks, learner answers/thoughts, failed output and successful send_to_user in a transcript. Cross budget; inspect exact extractor source and message anchors. Confirm only eligible prose, oldest-first unsplit batches and fingerprint coverage. Modify prose and confirm it reopens. | E070–E076, E082–E084; U074 |
| V016 Identity and reasoning-chain merge | Feed independent sources with equivalent propositions, distinct propositions and alternate arguments; include invalid link/endpoint/self-premise and redundant chains. Confirm correct identity union, joint-premise truth, deterministic simplification and no duplicate local-ID collisions. | E070, E075–E081, E088–E089 |
| V017 Extraction concurrency and failure | Start at least four source runs plus repeated same-source trigger; hold extractor/auditor barriers. Confirm three extractor permits, single-flight source order, FIFO audit/merge, exact live phase/part state, and cleanup on failure. Abort after one committed chunk; completed coverage remains, remaining content is honestly retryable. | E072–E074, E082–E084; U071–U074 |
| V018 Notes import reliability | Import multiple supported text files with same basename, changed contents, empty file, huge line, one failing chunk and concurrent repeat. Confirm explicit identity semantics, bounded workers, one request-indexed outcome per file, partial statistics, preserved successful chunks and picker retry. | E085–E087; U031 |
| V019 Graph truth, display and source navigation | Load single/multi-premise and birth-cluster fixtures with three-node hull threshold. Inspect canvas/chain views, source/message details and cluster reattribution. Pan/pinch/zoom/drag/search/sort/select, reload and merge new nodes; preserve camera/resting layout and hide hit targets correctly. | E088–E093; U001–U002, U015–U025, U027–U028, U033–U034 |
| V020 Context from selections | Choose incomplete/complete chains and isolated propositions; start Teach and Practice with controlled selection. Confirm displayed counts/Done behavior, up-to-64 snapshot context before learner prompt and only full selected arguments. | E004, E093; U006, U030 |
| V021 Deletion and resurrection guards | Delete a shared-source session using both policies, delete individual/batched nodes, and race each against turns/jobs/extraction. Confirm correct refusal/wind-down/recheck behavior; shared identities survive other references, dangling chains/positions disappear, and no stale result resurrects a deleted entity. | E094–E096; U011, U013, U026, U029 |
| V022 Worker completion versus delivery | Finish research/demo/visual/PDF jobs while a question blocks the session. Confirm worker becomes done/error and frees resources while delivery stays pending. Complete question, allow live steer or idle wake, then replay recovery; exactly one marker becomes durable. | E050, E100–E103; U057, U071–U073 |
| V023 Research service behavior | Use stub search/fetch endpoints for HTML/text/JS fallback/PDF/timeout/oversize/error cases. Confirm key/pin semantics, bounded tool results, cited isolated brief and honest gaps. Without search credentials, fetch a known URL and do not invent search results. | E051–E056; U057, U080 |
| V024 Generated demo verification and isolation | Script write→failing run→repair→pass, modify after pass, and force final verification failure. Confirm exact final HTML gate, probe/error reports, opaque lesson iframe, parent/storage restrictions, bounded auto-height, error-to-repair input and HTML download. Verify helper readiness/parent cleanup separately. | E057–E059, E069; U058, U107 |
| V025 Visual/PDF native rendering | Render SVG through resvg and an exotic SVG fallback; confirm exact-one-match edit and vision inspection loop. Render text/scanned/equation PDF pages in-process through PDF.js/Skia, enforce canvas/page/output bounds and page citations. Exercise no-browser availability separately, including current visual-worker gate. | E060–E063; U059–U060, U107 |
| V026 Local learner files and path input | Use a disposable macOS fixture directory with text/images, excluded directories, symlinks, binary/large files and permission errors. Drag file versus directory, edit chips with IME/undo/clipboard, and read/find/grep at limits. Confirm read-only scope, no shell, no copied upload and honest continuation/partial notices. | E064–E069; U061–U062 |
| V027 Activity, costs and rendering switches | Observe concurrent cross-session activity; expand usage/model/context and cancel rows. Inject priced/unpriced/subscription data, then disable rendering and extraction separately. Confirm truthful cost presentation, no lost stored data, preserved activity during transient fetch failure and proper coverage visibility. | E084, E096, E103–E104, E114; U002, U032, U071–U074, U084, U087 |

## M3: integrations and release

| Case | Script and expected result | Coverage |
| --- | --- | --- |
| V028 Full model/provider catalog | Contract-test all built-in provider rows and capability flags with sanitized recorded streams; test model search/effort selection and missing configuration. Run a representative live provider matrix only after fixture tests pass; record untested providers explicitly. | E107–E110, E114–E115; U075, U078–U083, U096 |
| V029 Custom endpoint lifecycle | Connect keyless and keyed mock servers with discovered/manual models; change URL/auth mode/revision/pins during live tool loop and simulate missing/malformed metadata. Confirm stale-write rejection, deliberate saved-key reuse, full key redaction and fresh per-operation config without losing prior settings. | E111; U090 |
| V030 Subscription account/consent boundaries | With fixture owners exercise ChatGPT multiple accounts, Copilot/Grok device/manual/cancel/retry/disconnect, stale account revision and consent changes during queued/foreground/background work. Confirm no API fallback, no secret/lease in renderer and pending automatic work remains honest. Use live accounts as separate evidence. | E112; U091–U093, U096 |
| V031 Retained web/dev subscription parity | After macOS scope, exercise web/dev same-origin controls, opaque one-use browser actions, server-machine sign-in and single auth-directory ownership. Record this as future parity until implemented and verified; a working desktop path does not satisfy it. | U094; E112 |
| V032 Claude Code integration | Test opt-out, missing/outdated CLI, signed-out/error event, valid stream/tool call, abort and context/config mismatch. Confirm version-only status claims, restricted local tool bridge, safe process reuse, session-reported effective context and honest usage. Live CLI lane requires an independently authenticated installation. | E113, E122; U075, U095 |
| V033 Dictation lifecycle | Use simulated PCM/token/socket traces, then an actual macOS microphone. Exercise permission refusal, missing key, delayed connection, final flush, Stop/keep, Escape/discard, navigation cleanup, one reconnect, language/multilingual switch and waveform resize. Confirm no duplication/lost buffered audio and no long-lived API key exposure. | E120; U063–U066 |
| V034 Prompt, keymap and appearance settings | Edit/enable/disable/delete prompt overrides and stale switches; rebind/reset shortcuts; customize installed font/background/type/emphasis; reload across sessions. Confirm source defaults are recoverable, field scopes remain independent and new glass appearance remains readable. Both themes and system appearance remain readable; the source light-mode limitation is intentionally improved. | E116–E117; U068, U085, U088–U089, U097 |
| V035 External history readers and debug mode | Export fixture history and use read-only text/JSON readers for sessions/graph/arguments. Confirm future-format refusal, no writes/network, and incomplete graph does not imply unknown learner knowledge. Toggle raw-provider debug recording with sanitized fixtures and verify default silence. | E121–E122 |
| V036 Distribution (amended for approved unsigned/manual scope) | Build unsigned arm64 ZIP/DMG, install into a clean macOS 26 environment, manually replace a previous app, retain library/credentials, verify checksum/source and native menus. Refuse future library schemas without rewriting. Signing/notarization and automatic installation are explicitly deferred; the original signed-updater scenarios remain later scope. | U105, U108–U110; E118 |
| V037 Later platform parity | Keep Windows per-user NSIS/menu/window-close and Linux AppImage/deb lifecycle/update cases on the roadmap. Run on actual target OS/architecture before claiming their parity; macOS subset evidence cannot close those portions. | U098, U100–U101, U105, U109 |

## Recovery and failure-injection priorities

These cases cut across milestones and should be run on transaction/storage and delivery implementations before broad provider expansion.

| Injection point | Required result | Related cases |
| --- | --- | --- |
| Process death after learner input save, before model output | Input remains once; next launch offers honest continuation/retry and never replays unsaved output as committed. | V009–V010 |
| Canonical reply save succeeds, usage/delivery bookkeeping fails | Reply stays durable; retry does not duplicate input/result; missing bookkeeping is recoverable and visible. | V010, V022 |
| Two views submit concurrently; one disconnects | One turn owns chat; stale sender receives 409; live computation survives view loss and can reattach. | V010 |
| Provider restarts tool-call IDs or emits parallel questions | IDs stay unique; sibling results remain adjacent and one final answer drives one reaction turn. | V005, V010 |
| Completed worker with pending delivery at restart | Restore delivery without recomputing; archived legacy terminal jobs with no obligation are not guessed into replay. | V022 |
| Running worker orphaned at restart | Respawn with saved input or declare recoverable failure; do not confuse a missing live process with a completed-but-pending result. | V022 |
| Question terminates run before queued steer drains | Park marker safely; next eligible learner/wake run includes it once. | V009, V022 |
| Abort while queued, rendering, fetching or saving metadata | Stop cancellable work, release queue/worker resources, keep committed chunks/usage, and report accurate partial state. | V017–V018, V022–V026 |
| Graph merge interrupted between several original file writes | Reconstructed transactional storage or recovery journal prevents false coverage and inconsistent graph; show which source chunks need retry. | V015–V018 |
| Session/node deletion races source work | Recheck ownership before merge, preserve shared data per chosen policy, and prevent resurrection. | V021 |
| SSE gap or failed refetch | Reconnect/visibility resync reads durable truth and does not blank valid previous data. | V010, V027 |
| Compaction fails or cannot advance cut | Full history remains; no empty-summary replacement or churn; next action reports/retries honestly without concurrent model use. | V011 |
| Custom endpoint/account authority changes mid-request | Stale operation cannot silently use new credentials or commit under obsolete consent; no secret escapes approved transport. | V029–V032 |
| Update download/install fails | App remains usable or clearly recoverable; existing data survives and old build refuses unknown future schema. | V036 |

## Additional explicit behavior checks

| Case | Script and expected result | Coverage |
| --- | --- | --- |

| V038 Teaching doctrine and plan consent | Inspect shared/teacher prompts, then evaluate a live derivation and learner-confirmed approach across beginner and intermediate tasks. Record pacing, first-principles steps and repair choices with a rubric; protocol success alone cannot establish consistent pedagogy. | E012, E014 |
| V039 Diagram and alert presentation | Render Mermaid source, invalid syntax, focus pan/zoom/fit and source copy, then GitHub note/tip/important/warning/caution blocks. Verify readable states in Moonforest and Dew. | U055–U056 |

## Product-quality evaluation beyond protocol parity

Use a small curated set of learning goals across math, programming, conceptual science and nontechnical material, with beginner/intermediate profiles and deliberate misconception traces. Evaluate:

- Diagnostic questions locate a relevant floor/ceiling efficiently rather than collecting easy correct answers.
- Every introduced prerequisite/derivation is valid and sourced where needed; plan maps are hypotheses, not mastery claims.
- Correct answers are committed before learner response; questions are unambiguous and distractors do not leak the key.
- Predictions and post-teaching checks perform different jobs; repairs do not skip over demonstrated confusion.
- Hint depth increases only as needed, wrong attempts do not automatically end practice, and retests change surface.
- Research/artifacts distinguish factual verification from structural parsing, successful rendering and model inspection.
- Long-session compaction retains goal, commitments, unresolved misconceptions, active plan/problem and learner preferences.
- A delayed retrieval/transfer study measures actual retention separately from satisfaction and immediate quiz success.

Keep pedagogy ratings and test transcripts reviewable. An internal prompt declaring a method superior is not empirical evidence of superiority; neither a passing fixture suite nor a graph full of propositions establishes learning effectiveness.

## Blockers and evidence still needed

| Blocker or prerequisite | Affected validation | Resolution before a parity claim |
| --- | --- | --- |
| Manual acceptance remains open | 14 manual rows and clean-machine release gate | The implementation/ChatGPT/hardening batch is complete; see the build-specific report and exact assertion index. |
| Installed LearnHarness version differs from pinned source | Reference acceptance baseline | Reconciled in docs/research/version-reconciliation.md; source 0.4.0 dc4c398 remains authoritative. |
| Provider/model catalogs and subscription behavior can change | V028–V032 | Recheck official provider contracts at implementation time, freeze reproducible contract fixtures and record representative live results. |
| Live service credentials, account eligibility and bounded usage budget | V023, V028–V033 | Configure an explicitly selected test service/account lane; fixture evidence alone remains protocol verification. |
| macOS microphone/VoiceOver/font and native UI permissions | V014, V026, V033–V034 | Exercise real system permission success/denial and assistive technology on the target macOS version. |
| Clean-machine unsigned installation and manual replacement | V036 as amended | Unsigned arm64 distribution and manual updates are approved; signing/notarization and automatic installation are deferred. |
| Other OS/architectures and web/dev release scope | V031, V037 | Keep those portions deferred visibly; obtain actual environments and run before declaring full parity. |
| Independent factual and learning-outcome evaluation | Pedagogy/artifact quality | Curate expert-reviewed tasks, delayed checks and transparent rubrics; preserve uncertainty rather than extrapolating protocol success. |

Completion of M1 should support a coherent macOS lesson/practice product. M2 adds knowledge and specialist work. M3 closes the macOS integration/release targets while the explicitly retained web/dev and cross-platform cases remain visible until their own evidence exists.
