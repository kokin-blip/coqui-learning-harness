# LearnHarness learning engine: source audit

Audit date: 2026-10-29. Reference: [amosblomqvist/learnharness at dc4c398](https://github.com/amosblomqvist/learnharness/tree/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f), package version **0.4.0**. All file/line references below refer to that commit, not a moving branch. This document covers the learning engine, agent capabilities, domain data, persistence, transport, recovery, and supporting services. The companion UI/desktop and REA runtime reports provide the other evidence boundaries.

Evidence status: **static source observations and code-derived behavior**. No model calls, teaching sessions, billing, microphone streaming, imports, deletion, or provider authentication were executed for this audit. Test definitions were inspected; their existence is not a test-pass result. Prompt instructions are identified separately from enforced mechanics. Complete feature parity requires runtime acceptance cases as well as this inventory.

## Important corrections to the upstream architecture narrative

The current code is more reliable evidence than `docs/architecture.md`, which still describes removed mechanisms:

- Practice now uses ordinary persisted **practice chats** driven by `problem` and `conclude`; the old partitioner/generator/grader problem-set pipeline, `/api/practice/*` routes, and practice store are absent from this checkout.
- The graph stores **propositions and reasoning chains**, not learner mastery ratings. Extraction reads learner-facing teacher prose only; learner answers, confidence, and thinking remain in sessions. Presence in the graph proves neither comprehension nor retention.
- Embedding extraction, semantic top-K context injection, and semantic clustering have been removed. Clusters derive from each proposition's **first surviving provenance source**. The graph readers are on-demand tools for the prober and, when enabled, practitioner; the teacher registry does not include them.
- Multiple-choice grading is deterministic in the client; free-recall grading is the next model reply against a precommitted answer. These are different trust and evaluation mechanisms.
- Plan status is **position**, derived from question calls tagged with `nodeId`. A visited node is not a passed or mastered node.
- Source comments can themselves lag implementation. For example, practice tool comments mention posing after conclusion in the same reply, while the current description/doctrine tells the model to end the turn and wait for explicit Next. The latter is a prompt rule; the `conclude` execute only frees the active-problem gate.

## Source anchors

The catalog uses source-relative `path:line` references. Open the pinned repository above and append `/<path>#L<line>` to a `/blob/<commit>` URL. High-value anchors:

| Key | Permanent source |
| --- | --- |
| Turn composition | [chat-handler.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/server/chat-handler.ts#L187) |
| Agent factories | [teacher-agent.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/agent/teacher-agent.ts#L171) |
| Question contract | [question-core.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/core/question-core.ts#L158) |
| Tool composition | [tools.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/agent/tools.ts#L314) |
| Practice | [practice.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/agent/tools/practice.ts#L72) |
| Extraction pipeline | [extraction.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/agent/subagents/extraction.ts#L1100) |
| Graph merger/read model | [graph.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/core/graph.ts#L148) |
| Background delivery | [jobs.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/server/jobs.ts#L222) |
| Model engine | [models.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/agent/models.ts#L131) |
| Defaults/contracts | [settings.ts](https://github.com/amosblomqvist/learnharness/blob/dc4c398d5167865b84b0ccb3ec809eb88bf8f65f/src/core/settings.ts#L503) |

## Feature catalog

IDs are stable references for our parity backlog. “Prompt” denotes intended model behavior, not a deterministic guarantee.

### Session and teaching lifecycle

| ID | Feature and mechanism | Evidence |
| --- | --- | --- |
| E001 | Create a learning session with title, timestamps, empty native transcript, generated chat ID, and schema stamp. Missing kind means teaching. | `src/store/chats.ts:35`; `app/api/chats/route.ts:22` |
| E002 | Create a separate practice session by saving `kind:"practice"`; it uses the same chat storage, model selection, streaming, export, and navigation substrate. | `src/store/chats.ts:43`; `src/server/chat-handler.ts:443` |
| E003 | Stamp each new session's model and thinking preference from the strong slot. Later global default changes do not replace that session's saved selection. | `app/api/chats/route.ts:29` |
| E004 | Start a session from graph selections. Up to 64 picks snapshot ID/name/statement in a leading graph-context marker; complete chains among selected nodes derive from the live graph at creation. | `app/api/chats/route.ts:43`; `src/core/chains.ts:34` |
| E005 | Rebuild a fresh agent on every turn from the durable native transcript, rather than retaining conversational state in a long-lived agent object. | `src/agent/teacher-agent.ts:30`; `src/server/chat-handler.ts:391` |
| E006 | Prober and teacher are separate factories/prompts/tool registries over the same conversation. Successful `probe_done` result selects teacher construction on future turns. | `src/agent/tools/probe.ts:49`; `src/server/chat-handler.ts:397` |
| E007 | Goal clarification uses an ungraded question. Prompt doctrine asks for a concrete target before planning. | `src/agent/prompts/prober/10-probe-doctrine.md:1`; `src/agent/tools.ts:97` |
| E008 | Adaptive diagnostic probing brackets a floor/ceiling per dependency strand; confidence and stated reasoning affect the next question. This is prompt-driven binary-search strategy, not a coded adaptive-testing model. | `src/agent/prompts/prober/10-probe-doctrine.md:21` |
| E009 | A structured diagnostic assessment contains one or more `{strand, assessment}` records and optional overall summary. It streams/persists as the `probe_done` call arguments. | `src/core/contracts/probe.ts:47` |
| E010 | `probe_done` refuses an outstanding question and repeated conclusion; successful assessment queues an automatic teacher handoff through the background-delivery protocol. Queue failure leaves assessment usable on the next learner turn. | `src/agent/tools/probe.ts:65` |
| E011 | Derive phases `probe → plan → teach` from transcript events: a successful probe result, then first node-tagged quiz/explain call. There is no stored phase counter or plan-acceptance verdict object. | `src/core/phases.ts:1` |
| E012 | Teaching method seeks motivated derivations from foundations, one reasoning step at a time, adapting Socratic/expository delivery to topic and learner energy. This is prompt doctrine. | `src/agent/prompts/teacher/05-method.md:1`; `teacher/20-teaching.md:1` |
| E013 | Predict → teach → check cycle: prediction is a separate pre-teaching question; the later explanation resolves it, then checks and repairs understanding. Role metadata drives different arrival UI. | `src/agent/prompts/teacher/28-predictions.md:1`; `src/core/question-core.ts:209` |
| E014 | Teacher presents an approach and plan, requests natural-language confirmation, and can rewrite the plan when gaps appear. Confirmation and appropriate pacing are prompt rules. | `src/agent/prompts/teacher/10-planning.md:1` |
| E015 | Normal text, question answer, continue, failed-turn retry, practice thinking, and practice Next are explicit input-event variants with server parsing and invalid-input 400 responses. | `src/core/input-events.ts:47`; `:159` |
| E016 | User can steer a live response. The text queues on the current agent's steering rail and is delivered at a response boundary; stranded messages remain parked for the next run. | `src/core/input-events.ts:111`; `src/server/jobs.ts:318` |
| E017 | Questions and practice problems can be dismissed without generating a new model turn; practice dismissal is finalized by a synthesized conclusion on the next input. Mid-turn dismissal may park until settlement. | `src/core/input-events.ts:74`; `src/server/dismissal-park.ts` |
| E018 | Retry failed output without resending the saved learner input or erasing old attempts: omit eligible trailing failures only from temporary model context. | `src/core/input-events.ts:250`; `src/server/chat-handler.ts:283` |

### Plan and questions

| ID | Feature and mechanism | Evidence |
| --- | --- | --- |
| E019 | `plan_init` authors/replaces the entire session dependency DAG from a constrained Mermaid block, rather than incremental node editing. | `src/agent/tools/plan.ts:62` |
| E020 | Mermaid parser accepts graph/flowchart directions, node titles, chained edges and a few arrow spellings; requires lowercase slug IDs; rejects unsupported syntax with line-specific problems. | `src/agent/tools/mermaid-plan.ts:44` |
| E021 | Pure tree validation enforces nonempty unique IDs/titles, existing endpoints, no self-loop, duplicate edge, or cycle. There is no coded 5–15-node size cap even though the tool description suggests that range. | `src/core/plan-tree.ts:36`; `:112` |
| E022 | Save plan version and immutable transcript snapshots for successful plan rewrites; give the model a slim validated-node-ID acknowledgment while record/UI details retain the full tree. | `src/agent/tools/plan.ts:74`; `src/server/turn-service.ts:82` |
| E023 | Derive current/visited/upcoming positions from quiz/explain `nodeId` calls, collapse consecutive repeats, ignore IDs absent from the latest tree, and allow revisits. Outcomes do not determine this status. | `src/core/contracts/plan.ts:132` |
| E024 | Choose one app-wide quizzing mechanic: multiple-choice (`probe`/`quiz`) or free recall (`recall`/`explain`). `agent.tools.explain === true` selects free recall. | `src/agent/tools.ts:314`; `:409` |
| E025 | Multiple-choice supports ≥2 options, single selection or multiple selection, optional details, required explanation, and a committed correct value/set. | `src/core/question-core.ts:158` |
| E026 | Cross-field validation rejects empty labels, duplicate effective values, unresolvable correct values, and several correct answers on single-select. Errors return to the model for repair before a valid question stops the run. | `src/core/question-core.ts:85`; `:112`; `src/agent/tools.ts:214` |
| E027 | Grade multiple-choice by exact selected-set match against stable values, independent of order; “I don't know” is a distinct input and yields false correctness with no confidence. | `src/core/question-core.ts:654`; `:708` |
| E028 | Shuffle choices with Fisher–Yates and per-tool-call seeded RNG for stable ordering across hydration/reload. | `src/core/question-core.ts:587` |
| E029 | Free recall commits a full answer/reasoning before posing, validates that it is nonempty, reveals the commitment on submit, and leaves nuanced grading to the model. | `src/core/question-core.ts:303`; `:350`; `:745` |
| E030 | Ungraded questions accept text or single/multi-select options and an Other response; their options can carry descriptions because there is no answer-key leakage. | `src/core/question-core.ts:367` |
| E031 | Teaching questions require role `predict`/`check` and an exact valid live-plan `nodeId`; probe questions use different names and schemas without either field. | `src/agent/tools.ts:186`; `src/core/question-core.ts:256`; `:326` |
| E032 | Predictions arrive open; teaching checks wait behind the reveal gate. The pure predicate applies to quiz/explain and defaults old missing roles to check. | `src/core/question-core.ts:232` |
| E033 | Optional learner confidence records a 0–100 integer probability on real MC answers, clamped defensively. Prompts interpret confident errors as misconception signals and uncertain successes as fragile evidence. | `src/core/question-core.ts:738`; `src/agent/prompts/shared/25-confidence.md:1` |
| E034 | Preserve two distinct reasoning channels: thinking about the question and thinking while reading teaching. Empty content is omitted from compact model-facing answer results. | `src/core/question-core.ts:708`; `:779` |
| E035 | Native tool-result `details` retain the full answer record while model-visible result returns only learner additions/verdict/confidence, avoiding repeated authored question/explanation payload. | `src/core/question-core.ts:754` |
| E036 | A clean question call ends the run through synthetic `terminate:true` plus a mixed-batch finish hook; invalid authoring retries inside the same turn. Synthetic posed results are never persisted as actual learner answers. | `src/agent/teacher-agent.ts:145`; `src/server/turn-service.ts:59` |
| E037 | Handle providers that issue several questions in a batch: answer siblings in order and defer the reaction turn until the last one is resolved, preserving provider call/result adjacency. | `src/server/chat-handler.ts:316` |
| E038 | Heal common argument serialization mistakes before validation, including nested JSON-encoded structures and copied scalar debris; preserve exact option membership before cleanup. | `src/agent/tools/heal.ts`; `src/core/argument-heal.ts`; `src/core/question-core.ts:631` |

### Practice engine

| ID | Feature and mechanism | Evidence |
| --- | --- | --- |
| E039 | Practitioner is active from turn one of a practice chat, without a diagnostic/plan split. It sees its own practice prompt plus selected shared voice/accuracy/mental-model/formatting fragments. | `src/agent/teacher-agent.ts:335`; `src/agent/prompt-segments.ts:37` |
| E040 | Pose a self-contained problem with mode `recall`, `discrimination`, or `composition`, optional graph proposition targets, and a committed hidden model solution. | `src/agent/tools/practice.ts:72` |
| E041 | Enforce at most one active problem. A turn-scoped shared gate seeds from the persisted transcript and changes immediately after pose/conclude, avoiding stale mid-turn storage reads. | `src/agent/tools/practice.ts:49`; `:136` |
| E042 | Normalize target names or IDs to graph IDs and validate against the entire current graph; absent/empty targets allow topic-only or outside-material practice. Ambiguous names resolve to the first matching stored node. | `src/agent/tools/practice.ts:111`; `src/core/chains.ts:70` |
| E043 | Allow many thinking submissions/claimed attempts per active problem; each is a labeled, problem-ID-linked user message, and each can generate a practitioner response. | `src/core/input-events.ts:224` |
| E044 | Conclude records outcome `solved`, `solvedWithHints`, `movedOn`, `surrendered`, or synthesized `dismissed`, verdict, hint rung R0–R5/null, miss class, and retest flag; reveals the original model solution. | `src/agent/tools/practice.ts:165` |
| E045 | Explicit Next is valid only in practice with no active problem; between-problem questions can be answered before another problem is posed. End-turn-after-conclusion pacing is instructed rather than enforced by conclude's return. | `src/core/input-events.ts:231`; `src/agent/tools/practice.ts:199` |
| E046 | Practice doctrine chooses weakest/most-connected/least-recently-active targets, interleaves problems, and progresses recall→discrimination→composition. This is model judgment from session evidence. | `src/agent/prompts/practice/10-doctrine.md`, sections III–V |
| E047 | Hints use a least-revealing R0–R5 ladder; wrong answers localize the first break; structural misconceptions get surgical repair. Retests use a fresh surface. These are prompt policies, not deterministic learning algorithms. | Same prompt, sections VI–IX |
| E048 | Practice can read learner files, use research/PDF jobs, and use gated graph readers. Its registry deliberately does not apply the teaching job-toggle filter, and excludes demo/visual tools. | `src/agent/tools/practice.ts:222` |
| E049 | Practice makes no graph extraction or coverage writes. Its attempt history and conclusion records are the v1 learning evidence; no standalone mastery state, spaced-review scheduler, or graduation model is implemented here. | `src/server/chat-handler.ts:585`; practice prompt preamble |

### Research, demonstrations, visual explanations, and learner files

| ID | Feature and mechanism | Evidence |
| --- | --- | --- |
| E050 | Dispatch research, demo, static-visual, or PDF specialist jobs with minimal complete briefs; save job input before execution, dedupe by chat+toolCallId, return immediate ack, continue teaching. | `src/agent/tools/jobs.ts:32`; `:73` |
| E051 | Researcher runs in an isolated context, receives no whole lesson by default, searches facets, fetches primary sources, returns a cited brief with gaps. It is capped at 12 model turns. | `src/agent/subagents/researcher.ts:19`; `:94` |
| E052 | Tavily and Brave search adapters use current key state. Without a pin auto-select first keyed engine in Tavily→Brave order; a missing explicitly pinned engine does not silently switch. | `src/server/search.ts:35`; `:130` |
| E053 | `web_search` defaults to 5 hits, max 10 at tool schema, returns title/URL/snippet, and reports unavailable search or errors as recoverable strings. Research dispatch still works with known source URLs and no search key. | `src/agent/tools/web.ts:127`; `src/agent/tools/jobs.ts:123` |
| E054 | `web_fetch` accepts HTTP(S), fetches readable HTML with Readability+Turndown, supports direct text, falls back to Jina Reader for unextractable pages, and points PDF URLs to the PDF downloader. | `src/agent/tools/web.ts:54`; `:83` |
| E055 | Web extraction applies 30s fetch timeouts, declared 5MiB content-length rejection, 40,000-character content truncation, and visible failure/truncation messages. The HTML path reads the body before truncating; the header check is not a streaming hard-size cap. | `src/agent/tools/web.ts:39`; `:108` |
| E056 | Research PDF tools download HTTP(S) documents to a per-job temporary directory, enforce a 25MiB streamed byte cap, probe PDF validity, and expose info/extract/search restricted to that job directory. | `src/agent/tools/pdf-read.ts:27`; `:78` |
| E057 | Demo builder authors single-file HTML/JS with `write_demo`, executes `run_demo`, and iterates; default 24 agent turns. Optional JS probes can inspect deeper page state. | `src/agent/subagents/demo-builder.ts:49`; `:99`; `:184` |
| E058 | Delivery gate rechecks the exact final HTML if needed; non-passing or unavailable execution yields empty HTML plus a failure note, which makes the job fail. Passing means no recorded console errors, page errors, or failed requests; it does not establish scientific correctness. | `src/agent/subagents/demo-builder.ts:234` |
| E059 | Lesson demos use an opaque-origin `sandbox="allow-scripts"` iframe; dynamic instruments can use Canvas/SVG and CDN dependencies. Browser verification is a separate headless execution surface. | Demo builder runtime contract; `src/agent/subagents/headless.ts:282` |
| E060 | Visual maker authors precise SVG with write/exact-one-match edit/render tools, rasterizes to PNG, feeds the image back to a vision model, and iterates up to 8 rounds. | `src/agent/subagents/visual-maker.ts:100`; `:134` |
| E061 | If a model finishes without rendering its latest SVG, code renders and presents it for inspection before finishing; on iteration exhaustion it can deliver the last rendered SVG with an explicit limit note. This ensures model exposure to a render, not independent correctness certification. | `src/agent/subagents/visual-maker.ts:184`; `:304` |
| E062 | PDF specialist triages page count/text quality, extracts selected ranges, searches, and visually renders target pages with page citations; default 14 model rounds, ≤6 rendered pages per call, and 24,000-character extraction cap. | `src/agent/subagents/pdf-reader.ts:28`; `:59`; `:165` |
| E063 | PDF pages render in-process through PDF.js and Skia (`@napi-rs/canvas`), with bundled font assets and geometry limited to 16M pixels and 8192px side. SVG rasterization uses resvg in-process first, with browser fallback for unsupported SVG features; demos require the Chromium service/system Chrome. The current visual-maker entry still consults shared browser-availability gating before its loop. | `src/agent/subagents/pdf-ops.ts:51`; `src/agent/subagents/headless.ts:415`; `:466`; `:520`; `src/agent/subagents/visual-maker.ts:134` |
| E064 | Read text/images directly from learner-supplied paths; bind image processing to the active model, apply orientation/conversion/resizing policy, and inform text-only models when images are omitted. | `src/agent/tools/read.ts:94`; `src/agent/image-processing/` |
| E065 | Text reads support 1-based offset and limit, cap output at 2,000 lines or 50KiB, and return continuation instructions. The underlying file is read before output slicing. | `src/agent/tools/read.ts:32`; `:46` |
| E066 | `ls`, file-glob `find`, and content-regex/literal `grep` operate through Node filesystem APIs without shell execution. Relative/default paths anchor to learner home. | `src/agent/tools/fs-shared.ts:38`; `ls.ts`; `find.ts`; `grep.ts` |
| E067 | Directory walks skip node_modules/.git/Library/.Trash, do not follow symlinks, bound walking at 10s, and preserve honest partial results. Direct read/ls paths are not restricted by walk exclusions. | `src/agent/tools/fs-shared.ts:23`; `:135` |
| E068 | Find defaults to 1,000 results; grep to 100 matches, 500 chars per line, 2MiB file skip, optional context/glob/case-insensitive/literal flags, and a separately bounded scan phase. | `src/agent/tools/find.ts:25`; `src/agent/tools/grep.ts:30` |
| E069 | Generic server tool execution forwards cancellation, limits calls to 30s and allows a 250ms cooperative abort grace; failures become tool results so models can recover. This is not process isolation for arbitrary generated code. | `src/agent/tool-execute.ts:34` |

### Knowledge graph and extraction

| ID | Feature and mechanism | Evidence |
| --- | --- | --- |
| E070 | Maintain persistent proposition nodes `{id,name,statement,aliases,createdAt,provenance}` and reasoning chains `{id,premises[],conclusion,createdAt,provenance}`. Premises jointly imply a conclusion; separate arguments remain separate chains. | `src/core/contracts/graph.ts`; `src/core/graph.ts:148` |
| E071 | Only learner-facing teacher prose (`text` or successful `send_to_user`) enters session extraction; label each passage with actual message ID. Quiz blocks, learner messages, thinking, operations, and failed output calls are excluded. | `src/agent/subagents/extraction.ts:122`; `src/core/coverage.ts:38` |
| E072 | Trigger asynchronous extraction after a settled teaching turn when uncovered estimated prose tokens reach the user chunk budget. Default 4,096; accepted floor 500; manual extract can process smaller remainders. | `src/server/turn-service.ts:109`; `src/core/settings.ts:515`; `app/api/graph/coverage/extract/route.ts:17` |
| E073 | Fingerprint each extractable message view with SHA-256 and compare against per-chat coverage rows. Modified prose gets a new fingerprint and becomes uncovered. Tokens are an approximate chars/4 measure. | `src/core/coverage.ts:68`; `:77`; `:115` |
| E074 | Batch oldest uncovered prose greedily without splitting a message. A message larger than budget runs alone. Batches from one source execute serially, and each later extractor sees that source's graph-so-far digest. | `src/core/coverage.ts:159`; `src/agent/subagents/extraction.ts:448`; `:1134` |
| E075 | Extractor receives source text and source-scoped prior propositions/chains; submits new core propositions, derivations, and valid in-batch message anchors. It is instructed to extract true domain ideas, not claims about learner ability. | `src/agent/subagents/extraction.ts:401`; `:470` |
| E076 | Extractor submit validation checks local/existing chain endpoints and message-anchor membership; malformed structures can be healed/retried. This validates structure, not truth/entailment. | `src/agent/subagents/extraction.ts:313`; `:338`; `:483` |
| E077 | Identity auditor receives only new propositions, not raw source or chains. It explores graph names/statements/aliases with glob find and birth-session readers, then submits `id → linkTo` equivalence verdicts; at most 16 turns. | `src/agent/subagents/extraction.ts:537`; `:576`; `src/agent/tools/graph.ts:112` |
| E078 | Extractor is explicitly trusted; auditor is an identity linker, not a factual verifier. Equivalence bias merges paraphrases; only identity links connect batches to existing nodes. | `src/agent/subagents/extraction.ts:537` |
| E079 | Deterministic merge creates new IDs or appends phrasings/provenance to existing nodes; unknown auditor target falls back to creating a node. A job-local ID map prevents cross-job local-ID collisions. | `src/core/graph.ts:148` |
| E080 | Resolve chain endpoints through local IDs or existing graph IDs; remove self-premises, dedupe premises, skip unresolvable/empty chains, and dedupe existing same-source assertions by premise-set/conclusion key. | `src/core/graph.ts:213` |
| E081 | Simplify redundant chains, preferring fewer premises and removing derivations covered by already-kept ancestry; rewrite all assertion lines for dropped chain keys. | `src/core/graph.ts:257`; `:300` |
| E082 | Append coverage only after node/chain work succeeds; completed prior batches survive abort/failure. A failed chunk remains uncovered while later non-aborted siblings may continue. Cross-file operations are synchronous single-process writes, not a database transaction. | `src/core/graph.ts:277`; `src/agent/subagents/extraction.ts:1100` |
| E083 | Single-flight per source prevents overlapping runs. Extractor concurrency is capped at 3 permits; audit+merge has a separate global FIFO lock so audits see the graph after earlier merges. | `src/agent/subagents/extraction.ts:826`; `:873`; `src/agent/subagents/bg-llm-semaphore.ts:30` |
| E084 | Activity exposes queued/extracting/waiting/auditing/merging phases, per-chunk position, cancellation controller, and partial stage usage; any exit cleans the live registry entry. | `src/agent/subagents/extraction.ts:618`; `:832` |
| E085 | Multi-file notes import accepts multipart files, decodes each as text, and runs a 3-worker pool. This route is text import across extensions, not a general binary document converter. | `app/api/graph/import/route.ts:43` |
| E086 | Notes source ID is `src_` plus 12 hex chars of SHA-256(filePath); route passes uploaded `file.name`. Same-named imports therefore share identity. Every explicit import processes the whole file again; this is not content-based exactly-once ingestion. | `src/agent/subagents/extraction.ts:1418`; `app/api/graph/import/route.ts:59` |
| E087 | Notes chunk by whole lines with the same token budget, keep source-scoped digest/usage, reject concurrent same-source imports, and return completed/partial/failed/aborted/busy with partial merge statistics. | `src/agent/subagents/extraction.ts:1251`; `:1393`; `:1420` |
| E088 | Read model keeps first node name/statement/creation time, unions later statements into aliases and provenance; combines identical chain assertions by logical key. | `src/core/graph.ts:405` |
| E089 | Derive graph rendering from chain truth: single-premise chain becomes direct arrow; multi-premise chain gets an implication junction plus converging edges. A separate logical-edge view carries inference/depth semantics. | `src/core/graph.ts:456` |
| E090 | Build graph snapshot with propositions/chains/render edges, source labels, node-source indexes, clusters, and saved positions. Provenance can deep-link to a real chat/message or identify notes source. | `src/core/graph.ts:509` |
| E091 | Birth-session clustering uses the first surviving provenance source; clusters with ≥3 propositions get hulls, labels come from session titles/file paths, and implication membership follows majority of premise birth sources. No model/embedding call. | `src/core/session-clusters.ts:50`; `src/core/graph.ts:555` |
| E092 | Graph map readers list birth sources and names of propositions born in a source; prober/practitioner receive names-only rather than full prior transcripts. Gate is graph master on AND graph-tools toggle not false. | `src/agent/tools/graph.ts:41`; `src/core/settings-resolution.ts:258` |
| E093 | Selected-chain view includes a stored chain only when all premises and conclusion are selected; leftover selected propositions become singleton rows. This supplies practice/context material without inventing missing arguments. | `src/core/chains.ts:34` |
| E094 | Session deletion has explicit preserve-graph or delete-nodes modes. The latter removes source-specific phrasings/provenance and orphan nodes/chains, while shared identities survive other references. | `src/core/graph-deletion.ts:96`; `app/api/chats/[id]/route.ts:68` |
| E095 | Single-node deletion removes that identity and every chain touching it; server refuses while any extraction is registered. Session deletion refuses active turns/computing jobs, aborts its extraction, waits bounded wind-down, rechecks, then purges. | `src/server/graph.ts`; `src/server/chats.ts:98` |
| E096 | Extraction master switch gates writes and agent graph access; rendering switch independently chooses graph canvas vs chain presentation without disabling ingestion. Existing files remain stored. | `src/core/settings-resolution.ts:245`; `:254` |

### Runtime, durability, models, and controls

| ID | Feature and mechanism | Evidence |
| --- | --- | --- |
| E097 | Write learner input to disk before model work. One active turn per chat is claimed via process-global liveness; competing sends get 409. Save canonical output before announcing settlement. | `src/server/chat-handler.ts:337`; `src/server/turn-service.ts:59` |
| E098 | Turn computation is a background object; POST acknowledges acceptance and closes, while GET `/stream` attaches/replays live view data. Navigating away disconnects a view without aborting the computation. | `src/server/chat-handler.ts:509`; `:656`; `app/api/chats/[id]/stream/route.ts:18` |
| E099 | Persist partial native output after abort, stamp message IDs, preserve provider-native usage/thinking metadata, filter synthetic question placeholders, and uniquify provider-reused tool-call IDs. | `src/server/turn-service.ts:59`; `src/server/pi/call-ids.ts` |
| E100 | Jobs record running/done/error separately from pending/delivered result obligation; completion saves outcome plus pending delivery before releasing resources, so waiting on a question does not retain a computing worker. | `src/agent/subagents/runner.ts:300`; `src/core/contracts/jobs.ts` |
| E101 | Finished job results steer a live agent at a boundary or wake an idle session. Pending questions defer automatic wake; deterministic IDs and durable transcript checks prevent duplicate delivery. | `src/server/jobs.ts:222`; `:474`; `:695` |
| E102 | Lazy recovery restores pending delivery and respawns orphaned running workers, throttled at 30s on jobs reads; live registration also restores pending delivery without requiring a poll. Old terminal records with no delivery metadata are not replayed speculatively. | `src/server/jobs.ts:673`; `:717` |
| E103 | True abort handles turns, jobs, and extraction separately. Job abort saves “Aborted by learner” plus pending abort notice, fires its controller, and delivers a teacher notification; spent completed usage survives. | `app/api/activity/abort/route.ts:22`; `src/server/jobs.ts:431` |
| E104 | Push state changes through one app-scoped SSE event bus with 25s heartbeats. Notify→fetch events include turn-started/settled, jobs/activity/chats/record/compaction/subscription changes; reconnect consumers resync ordinary APIs. | `src/core/events.ts:26`; `src/server/events-stream.ts:30` |
| E105 | Context compaction triggers at min(user threshold, model window−16,384). Factory threshold 150,000, settings floor 32,000; retain about 20,000 recent tokens and summarize earlier context with phase/plan-aware instructions. | `src/core/compaction.ts:49`; `src/server/compaction.ts:146` |
| E106 | Compaction appends a summary marker/cut boundary without deleting full history; future provider projection uses summary+kept tail. It can start during reading pauses, blocks interleaving model work for that chat, has anti-churn checks, and records its usage. | `src/server/compaction.ts:176`; `:280`; `src/core/native-messages.ts` |
| E107 | Resolve all agent engines through Pi's provider/model catalogs. Strong slot supplies conversation, cheap supplies research/demo/extractor/auditor, vision supplies SVG/PDF; selected background roles can independently override model/thinking. | `src/agent/models.ts:82`; `src/core/settings.ts:315` |
| E108 | No factory model default. Missing needed slot or provider key yields explicit 503 configuration envelope before model work/write-ahead side effects; background stages enforce their own readiness. | `src/server/chat-handler.ts:208`; `src/agent/subagents/extraction.ts:804` |
| E109 | Reasoning preference supports off/minimal/low/medium/high/xhigh/max. Unset preference chooses first supported level from medium/low/high/minimal/xhigh/max; explicit levels clamp to the model's supported range. | `src/core/settings.ts:88`; `src/agent/models.ts:143` |
| E110 | Register 35 plain-key provider rows in the current catalog, including shared-key variants; built-in provider catalog can contain additional non-plain-key routes. Key-presence gating and catalog metadata feed model pickers. | `src/core/auth-keys.ts:87`; `src/server/model-catalog.ts` |
| E111 | Configure one custom OpenAI-compatible endpoint, keyless or API-key authentication, model discovery or manual IDs, context/output/reasoning overrides, and reconnect/disconnect. Custom stream revalidates current metadata before each operation. Default unknown budgets are 8,192 context and 4,096 output. | `src/core/settings.ts:211`; `src/server/custom-provider.ts`; `src/agent/models.ts:158` |
| E112 | Distinct subscription routes support ChatGPT, GitHub Copilot, and xAI connection flows, status, catalogs, and independent background consent. They do not fall back to ordinary API routes; private transport/credentials remain host-owned. | `src/core/contracts/subscriptions.ts`; `src/agent/subscription-runtime.ts`; `src/server/web-subscriptions.ts` |
| E113 | Optional Claude Code provider uses an explicit app-wide opt-in, installed binary/version detection, process/event bridge, context reuse, native stream conversion, and tool bridge. It is a separate integration, not plain Anthropic API-key selection. | `src/agent/claude-code/`; `src/server/claude-code.ts`; `app/api/claude-code/route.ts:4` |
| E114 | Persist per-call token usage for conversation, jobs, extraction, compaction; price on read via Pi catalog calculation. Preserve unknown prices/usage as unknown; subscription labels coexist with API dollars without invented subscription-dollar estimates. | `src/core/prices.ts:28`; `src/server/pricing.ts`; `src/agent/subagents/runner.ts` |
| E115 | Keys live in separate auth JSON/environment, hot-reload through server seams with real environment winning. Status APIs expose masking, source and shadowing, shape-only save validation, and deletions. They do not test that a key is live. | `src/core/auth-keys.ts:163`; `src/server/keys.ts`; `src/store/auth.ts` |
| E116 | General preferences use a versioned delta settings record; missing keys inherit factory defaults, known values sanitize/clamp, unknown keys survive round trips, and section replacement isolates independent settings panels. | `src/core/settings.ts:1`; `src/store/settings.ts`; `app/api/settings/[section]/route.ts:53` |
| E117 | Inspect/edit/reset prompt fragments with explicit override switches. Discover numeric-prefix source fragments dynamically; enabled file+switch wins, absent/deleted overrides fall back; orphan switches heal off. Changes apply next turn. | `src/agent/prompt-segments.ts:67`; `src/store/prompt-overrides.ts`; `app/api/settings/prompts/` |
| E118 | Persist chats/jobs/settings as local JSON and graph evidence as JSONL; graph reader skips corrupt/invalid lines. Schema stamps reject future-format records rather than rewriting unfamiliar data. `LH_DATA_DIR` relocates mutable storage. | `config.ts:17`; `src/store/chats.ts:57`; `src/store/graph.ts:53`; `src/store/graph-format.ts` |
| E119 | Export both session kinds as downloadable Markdown with safe slugged filename and no message anchors. Full-history export and model compaction projections are separate uses. | `app/api/chats/[id]/markdown/route.ts:26`; `src/core/session-markdown.ts` |
| E120 | Dictation server mints a 300s Deepgram token without exposing the API key; browser sends 16kHz mono linear16 audio directly to Nova-3 with formatting, punctuation, 300ms endpointing, and chosen mono/multilingual code. | `app/api/stt/token/route.ts:18`; `src/core/dictation.ts:85` |
| E121 | External agents can read local learning history through a bundled standard-library Python skill: session list/read, optional reasoning/operation inclusion, graph source/proposition/find/chain views, text or JSON output, and future-schema refusal. Readers do not require a running app or network. | `skills/learnharness/SKILL.md`; `scripts/sessions.py`; `scripts/graph.py`; `scripts/_data.py` |
| E122 | Optional `LH_PROVIDER_EVENTS=1` records raw provider events under per-chat/source debug JSONL to investigate transport issues; normal operation omits it. Model-side `send_to_user` is added for Claude-compatible engines to preserve learner-visible delivery through that provider's tool path. | `src/agent/provider-events.ts`; `src/agent/teacher-agent.ts:197` |

## Tool availability matrix

This matrix is the registry assembled by the inspected factories. “Gated” means absent when the graph capability gate closes. Teaching job toggles affect prober/teacher registries. Practice's supplementary tools bypass those toggles in the current implementation.

| Tool | Prober | Teacher | Practitioner | Dedicated worker |
| --- | --- | --- | --- | --- |
| `probe` OR `recall` | Chosen mechanic | — | — | — |
| `quiz` OR `explain` | — | Chosen mechanic | — | — |
| `ask_user_question` | Yes | Yes | — | — |
| `probe_done` | Always | — | — | — |
| `plan_init` | — | Yes | — | — |
| `problem`, `conclude` | — | — | Yes | — |
| `read`, `ls`, `find`, `grep` over local files | Yes | Yes | Yes | — |
| `list_sessions`, `list_propositions` names-only graph readers | Gated | — | Gated | — |
| `research`, `pdf` job dispatch | Toggleable | Toggleable | Yes | — |
| `demo`, `visual` job dispatch | — | Toggleable | — | — |
| `send_to_user` | Conditional Claude route | Conditional Claude route | Conditional Claude route | — |
| `web_search`, `web_fetch` | — | — | — | Researcher |
| `web_fetch_pdf`, `pdf_info`, `pdf_extract`, `pdf_search` | — | — | — | Researcher with PDF temp dir |
| `pdf_info`, `pdf_extract`, `pdf_search`, `pdf_render` | — | — | — | PDF reader |
| `write_demo`, `run_demo` | — | — | — | Demo builder |
| `write_svg`, `edit_svg`, `render_svg` | — | — | — | Visual maker |
| `submit_findings` | — | — | — | Extractor |
| graph `find`, full-text `list_sessions`/`list_propositions`, `submit_review` | — | — | — | Identity auditor |

## Data and execution flows

### One teaching turn

1. Parse input and load chat; verify configured conversation model/key/catalog and retry eligibility.
2. Wait for or perform necessary context compaction, then reread current chat.
3. Convert input into native transcript appends; if several questions remain, persist this answer and wait for the others.
4. Claim chat turn; write input ahead of execution. Build prober/teacher from successful probe seam, or practitioner from kind.
5. Construct engine/tools/prompts and native model projection. Register live steering before model execution.
6. Run model/tool loop as a background object; acknowledge POST, let a view attach through `/stream`.
7. On cleanly posed question/problem, stop; on errors retry as permitted; on explicit abort preserve available partial output.
8. Persist new native messages and plan snapshots; append completed usage; reconcile delivery; trigger teaching extraction if over budget; announce settlement; optionally kick context compaction.

### Graph pipeline

`eligible teacher prose → fingerprint diff → oldest-first batches → source digest + new text → extractor findings → serialized identity audit → deterministic node/chain merge → simplification → coverage append → layout settle → fresh graph snapshot`.

There are two different graphs: the lesson plan is a session-scoped prerequisite hypothesis; the persistent library is extracted domain propositions and arguments. The plan is not blindly promoted to the library. Their identifiers, status semantics, and writers should remain distinct in a reconstruction.

### Background result

`tool dispatch → durable job+input → isolated worker → durable terminal result + pending delivery → free worker resources → live steer OR idle wake → durable transcript marker → mark delivered`.

Delivery is a separate obligation from computation. Do not turn a finished worker back into “running” merely because a learner is answering a question.

### Durable file families

| File family under configured data root | Meaning |
| --- | --- |
| `chats/<chatId>.json` | Native messages, session model preferences/tree, usage/extraction records, kind and timestamps |
| `jobs/<jobId>.json` | Job kind/input/status/result/activity/usage and delivery obligation |
| `graph/nodes.jsonl` | Proposition create/link assertions |
| `graph/chains.jsonl` | Joint-premise argument assertions |
| `graph/coverage.jsonl` | Teacher-prose fingerprints, source IDs, token estimates, fold times |
| `graph/sessions.jsonl` | Legacy/notes fold checkpoints; not learner progress |
| `graph/sources.json` | Imported-file identity/path/import time/usage |
| `graph/positions.json` | Rebuildable resting positions |
| `graph/render-settings.json` | Graph presentation controls |
| `graph/format.json` | Graph-family schema stamp |
| `settings.json`, `prompts/**` | Nonsecret delta preferences and optional prompt overrides |
| `debug/provider-events/**` | Opt-in debugging, potentially detailed provider payloads |
| Separate host auth store | Secrets, not graph or general preferences |

The stores use synchronous whole-file writes and per-line appends. Event-loop serialization prevents in-process JavaScript interleaving in synchronous blocks; it does not make several files power-loss-atomic, safe for multiple server owners, or automatically mergeable across devices. The reconstruction should preserve transparent exports while strengthening storage guarantees.

## HTTP surface inventory

The mechanical inventory in [engine-api-routes.json](engine-api-routes.json) records **34 route files and 45 explicitly exported HTTP methods**, each with source line. No endpoint was invoked to generate it.

| Area | Routes |
| --- | --- |
| Session lifecycle | `/api/chats` GET/POST; `/api/chats/[id]` GET/PUT/DELETE; `/settings` PUT; `/markdown` GET |
| Turns and view attachment | `/api/chat` POST; `/api/chats/[id]/stream` GET; `/steer`, `/dismiss`, `/artifact-ui` POST |
| Background | `/api/jobs` GET; `/api/activity` GET; `/api/activity/abort` POST; `/api/events` GET |
| Graph | `/api/graph`, `/status`, `/costs` GET; `/coverage/extract`, `/import` POST; `/positions` PUT; `/render-settings` GET/PUT; `/nodes/[id]` DELETE |
| Settings/prompts | `/api/settings` GET; `/api/settings/[section]` PUT; `/api/settings/prompts` GET; `/api/settings/prompts/[...segment]` PUT/DELETE |
| Providers/services | `/api/models`, `/api/search`, `/api/keys`, `/api/claude-code`, `/api/stt/token` GET; `/api/keys/[id]` PUT/DELETE |
| Custom endpoint/subscriptions | `/api/custom-provider` GET/POST/PATCH/DELETE; `/api/subscriptions` GET/POST; `/api/subscriptions/browser` GET/POST |

These are local app transport surfaces, not a demonstrated hosted multi-user API. The client answer path accepts an answer object and matches pending call identity; it does not recompute MC grading server-side. If our app adds sync/accounts/remote clients, authoritative grading and authorization become explicit new boundaries.

## Inspected tests and what they establish as intended contracts

No tests were run for this source audit. Key inspected definitions:

| Test source | Contracts represented in the suite |
| --- | --- |
| `tests/question-core.test.ts:78`, `:252`, `:439`, `:446`, `:656` | Authoring validation, correct-key coercion, confidence stops, answer records, free-recall commitment |
| `tests/chat-flow.test.ts:277`, `:851`, `:948`, `:1121`, `:1457`, `:1592`, `:1677` | Scripted agent flow, canonical persistence failures, navigation/write-ahead, background turn views, sibling questions, user steering, duplicate call IDs |
| `tests/extraction.test.ts:335`, `:1066`, `:1722`, `:2055`, `:2237`, `:2340` | Teacher-only source view, exact message anchors, chunk coverage, serial source digests, chain simplification, notes retry/completion |
| `tests/graph.test.ts:279`, `:610`, `:669`, `:845`, `:1064` | Merge/storage semantics, deletion modes, single-node deletion, chain/junction derived geometry |
| `tests/job-delivery-recovery.test.ts:93`, `:132`, `:187`, `:243`, `:276` | Worker completion separate from delivery, repeated recovery idempotence, HTTP acceptance vs durable marker, canonical save wins, fresh-process pending restore |
| `tests/compaction.test.ts:67`, `:149`, `:230`, `:320`; `tests/compaction-service.test.ts` | Usage-anchored estimates, safe cut points, projection boundary, summary prompt, compaction lifecycle |
| `tests/practice-agents.test.ts`, `practice-flow.test.ts`, `practice-record.test.ts`, `practice-heal.test.ts` | Practitioner registry, active-problem flow, record folds, argument/target healing |
| `tests/researcher-pdf.test.ts`, `pdf-reader.test.ts`, `demos.test.tsx`, `svg-native-render.test.ts` | Isolated research/PDF paths, verified demo/visual outputs and rendering contracts |
| `tests/schema-stamps.test.ts`, `golden-fixtures.test.ts`, `settings-resolution.test.ts`, `auth-provider-keys.test.ts` | Stored format compatibility, captured data compatibility, fallback rules, built-in key catalog drift |

## Proposed improvements for CoquiLearn, distinct from parity

These are product/architecture proposals, not claims about LearnHarness.

1. **Keep a world graph and a separate learner-evidence model.** Record dated response evidence, uncertainty, hint depth, cue context, and retention checks without treating graph presence as mastery. Show source-backed “demonstrated on” information, with corrections and uncertainty.
2. **Add spaced/interleaved review scheduling.** Schedule retrieval based on explicit evidence and elapsed time; allow goals/deadlines and custom workload. Retain practitioner's hint ladder and fresh-surface retests, with deterministic scheduling outside model prose.
3. **Make prompt-critical rules executable where they matter.** Enforce conclusion→pause, plan confirmation before first teaching, typed hint/reveal actions, and rubric checks as state transitions. Keep pedagogical choice with the agent.
4. **Strengthen artifact verification.** Add instrumented interaction checks for demo controls, independent numeric/physics assertions where possible, source/domain policies for generated artifacts, and explicit “rendered / exercised / concept-checked” verification levels.
5. **Use a transactional local database behind ports.** SQLite WAL plus append-only logical events, schema migrations, job/delivery outbox, and content-addressed artifact files can make the multi-file failure windows atomic. Preserve JSON/Markdown export and human-readable backup manifests.
6. **Improve import identity.** Distinguish stable document ID, original relative path, content hash, version, and import attempt. Deduplicate duplicate uploads, incrementally re-extract changed ranges, handle same-name files safely, and make partial failures retryable by chunk.
7. **Add document-grounded learning.** A proper PDF/EPUB/DOCX/web ingest pipeline with searchable source spans and page citations can feed lessons, graph extraction, questions, and answer verification through one provenance model.
8. **Build provider economics into orchestration.** Budget caps per session/day/job, cost preview, concurrency by provider, pause-before-overrun, visible unpriced usage, and configurable local-model routing. Never silently substitute a provider.
9. **Give durable controls to background work.** Per-job pause/resume/retry/cancel, persistent activity history and failure explanations, and safe app shutdown/resume across every operation.
10. **Prepare desktop/mobile boundaries now.** Keep pure domain and provider contracts portable; put filesystem access, secret storage, model execution, browser artifacts, and sync behind host adapters. An iOS companion should not inherit unrestricted home-directory reads or assume Electron exists.
11. **Add learning evals.** Evaluate factual support, prerequisite validity, question ambiguity, answer-key stability, hint leakage, transfer, and delayed retention. Deterministic fixture tests alone cannot establish learning effectiveness.
12. **Offer transparent memory controls.** Inspect/correct/merge/split a proposition, accept/reject extraction, edit provenance safely, manage private documents and backups, and distinguish removing a session from removing knowledge derived from it.

## Coverage and remaining unknowns

Answered statically: current learning/tool registries, data ownership, teaching/practice mechanics, graph pipeline and exact exclusions, model-resolution defaults, file/API families, main recovery/cancellation paths, and important absent/replaced architecture.

Partially answered: full provider protocol correctness, all browser-service failure modes, scientific quality of generated artifacts, long-session memory quality, accessibility behavior, and platform-specific packaging; these need runtime/desktop evidence or focused test execution. The companion audits own visual UI details, host security/update flows, and installed-version comparison.

Unresolved without exercising configured services: actual model adherence to diagnostic/pedagogical doctrine, live provider and subscription availability/terms, token/cost accuracy against invoices, real microphone latency/accuracy, end-to-end recovery during abrupt process death, and learning outcomes. Do not label these as observed successes.
