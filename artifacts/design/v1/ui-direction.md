# CoquiLearn UI direction

Created 2026-10-29. **macOS is the first release platform.** These are original, editable design concepts for a new implementation. They are not a functioning application, a complete screen specification, or a clickable prototype. Values and lesson content in the frames are illustrative.

[Open the Figma design](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt). The Figma document was initially named “Coqui — Learning Studio”; all on-canvas branding is now **CoquiLearn**. The connector does not support renaming the document. Its desired title is **CoquiLearn — Learning Studio**.

## The visual idea

CoquiLearn should feel like a quiet learning instrument with the material polish of an Apple app. Use warm white reading surfaces, deep forest text, seafoam selection, and translucent navigation. The lesson, question, and reasoning carry the visual weight. The chrome gives them a place to live.

Glass has a functional boundary: sidebar, compact toolbar, popovers, and floating navigation. Teaching, questions, tables, citations, and long-form notes use opaque surfaces. Avoid blurring the text behind the learner's active reading area. Respect the macOS Reduce Transparency preference with an opaque material replacement.

This direction interprets the user's “iOS glassy” request as a material and interaction influence for a Mac app. It does not impose phone navigation or touch-only controls on the desktop.

## Editable screens

| Frame | Purpose | Figma | Local preview |
|---|---|---|---|
| Home · Knowledge map | Start from a question or connected knowledge; show selected context before sending | [Home](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-2) | [home.png](../../artifacts/design/home.png) |
| Learn · Adaptive lesson | One active learning step, structured answer, thinking, confidence, visible path, and background work | [Lesson](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-137) | [lesson.png](../../artifacts/design/lesson.png) |
| Practice · Retrieval and review | A self-contained problem with reasoning input; separate a proposed recall queue from baseline practice | [Practice](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-305) | [practice.png](../../artifacts/design/practice.png) |
| Future iPhone companion · Review | Explore short retrieval sessions after macOS; no commitment to mobile for the first release | [Future companion](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-420) | [mobile.png](../../artifacts/design/mobile.png) |

The three desktop frames are 1440 × 960. The future companion is 390 × 844. All screens consist of editable text, frames, vector paths, and local control instances. No full-screen screenshot is used as a design layer.

The Figma file contains 477 created screen/annotation nodes, 12 primitive color variables, 12 semantic aliases, 11 geometry variables, Light/Dark color modes, six shared text styles, one glass effect style, and a four-variant local button family. There are 687 numeric bindings for applicable spacing, padding, and radii. Component construction assets sit outside the review frames.

## What is retained and what is proposed

The source audit is the feature authority: [product/desktop catalog](../research/product-desktop.md) and [learning-engine catalog](../research/learning-engine.md). The four compositions illustrate a visual system; they do not replace that full parity inventory.

| Capability | Place in CoquiLearn | Evidence or status |
|---|---|---|
| Teach and practice entry | Home mode selection and New Session action | Baseline: U003–U006, E001–E004 |
| Graph, chains, proposition search, camera, provenance | Map workspace; selection inspector and chain view required beyond the illustrated canvas | Baseline: U016 onward; graph/extraction section of engine audit |
| Diagnostic probing, plans, teaching phases | One lesson workspace with explicit phase and visible plan | Baseline: E006–E023 |
| Multiple choice, multi-select, free recall, ungraded questions | One question renderer with schema-specific controls | Baseline: E024–E038; only single-select is drawn |
| Thinking while answering and reading | Distinct labeled inputs; voice can target the focused field | Baseline: E034; the answer-thinking input is drawn |
| Confidence | Optional 0–100 probability control; presets may accelerate entry | Baseline: E033. Drawn categorical presets are shorthand, not permission to discard numeric precision |
| Background research, demos, static visual explanations, PDFs | Activity inspector beside the lesson; compact completion arrivals | Baseline: E050–E069; research row drawn |
| Practice outcomes, hints and fresh retests | Problem workspace with visible lifecycle and explicit Next | Baseline: E039–E049; hints shown, conclusion/retest states still need frames |
| BYOK, model slots, per-session model, subscriptions/custom providers | Settings plus contextual model control | Baseline: full product integration catalog; provider settings are not drawn |
| Session search, rename/export/delete; transcript find | Native menus and keyboard-first command entry around the workspace | Baseline: U007–U015 |
| Costs, context usage, extraction progress, editable prompts/render settings | Settings and inspectable status popovers | Baseline: product catalog; status values in frame are illustrative |
| Scheduled spaced retrieval and a review queue | Separate Review destination with an honest schedule and evidence history | **Proposed new feature**, not an extracted baseline implementation |
| Long-term mastery estimates/calibration | Optional evidence model separate from proposition truth | **Proposed**. The current graph is not a mastery score |
| iPhone companion and device synchronization | Short retrieval and capture flow after the Mac app is stable | **Proposed**; mobile is outside the first release |

The lesson plan says **Covered**, **Learning now**, and **Up next**. “Covered” is a navigation/history state. It must not be presented as proof of mastery. Current LearnHarness plan position derives from relevant transcript calls, not an outcome model.

## Information architecture

Use four top-level destinations:

- **Map:** knowledge canvas, accessible chain/table alternative, proposition/source details, import, and search.
- **Learn:** teaching sessions, diagnostic phase, dependency plan, current question, and the learner's reasoning.
- **Practice/Review:** baseline guided practice first; scheduled review becomes a distinct subsection only after its scheduler exists.
- **Library:** imported notes, PDFs, source sessions, exported materials, and reusable generated explanations.

“Review” appears in the concept navigation to show the expansion direction. Before its scheduler ships, label the release destination **Practice** and remove due badges. Never ship an empty destination that promises a future capability.

Sessions remain in a persistent sidebar with search, grouping/filtering, active state, and clear background activity. Settings belongs in the macOS application menu and sidebar footer. Model choice is contextual; it should not be hidden behind application settings every time.

For the first session, the main area asks what the learner wants to understand. Provider setup preserves the draft and explains which role/model is missing. After configuration, the learner sends explicitly. Import is an alternate starting point, not a required onboarding step.

## Core flows

**Learn:** goal → provider/model admission → clarify and probe → inspect proposed path → predict → explanation → check/repair → connected knowledge. Persist the learner's draft, confidence, and reasoning independently of streaming UI state. A research completion should not cover the active question or move keyboard focus.

**Map:** search/select proposition → read statement and provenance → inspect premises/conclusions → teach or practice using the selected context. Keep camera stable after a rename or extraction result. Offer a list/chain view with equivalent access to statements and sources.

**Practice:** choose topic or graph context → receive a problem → submit thinking/attempts → request graded hints if needed → receive outcome and original solution → explicitly continue. The prototype's “Problem 3” is illustrative progression, not a fixed eight-problem generation contract.

**Research:** compact job acknowledgment → activity visible in inspector → optional steer/cancel → result arrives with sources or an explicit failure. A busy job must not look like the teaching conversation is frozen.

**Recover:** retain entered text → explain the specific failure → give a localized recovery action. Distinguish provider admission, connection loss, interrupted generation, tool failure, background extraction failure, and incomplete graph coverage.

## Tokens

The Figma collections are named `CoquiLearn / Palette`, `CoquiLearn / Theme`, and `CoquiLearn / Geometry`. Semantic colors alias primitives and expose web code syntax. Light is the reviewed screen theme; Dark values are a starting foundation and have not received a separate visual composition pass.

| Semantic token | Light | Dark | Use |
|---|---|---|---|
| `--color-canvas` | `#F3F5EF` | `#10241F` | Workspace background |
| `--color-surface` | `#FFFFFF` | `#19352C` | Reading/response surfaces |
| `--color-surface-soft` | `#EAF1E9` | `#203F35` | Quiet grouped region |
| `--color-ink` | `#183E34` | `#F1F7F2` | Main text |
| `--color-muted` | `#566E63` | `#B6CCBF` | Supporting text |
| `--color-accent` | `#17694F` | `#94DDAC` | Primary action/active context |
| `--color-accent-soft` | `#DCEEE0` | `#294C3C` | Selection background |
| `--color-on-accent` | `#FFFFFF` | `#10241F` | Text on primary action |
| `--color-line` | `#CFDCD1` | `#3E5D4D` | Dividers/graph links |
| `--color-warning` | `#8C5713` | `#EDC47B` | Recoverable attention state |
| `--color-warning-soft` | `#FBF0DB` | `#493A20` | Attention surface |
| `--color-lilac` | `#E8E4F2` | `#3F354D` | Optional topic distinction |

Spacing values: **4, 8, 12, 16, 24, 32, 48**. Structural radii: **12** for input/answer groups, **20** for reading regions, **28** for glass shell, and **999** for compact pills. Use consistent radii by role; do not make every content paragraph a card.

Glass reference: surface fill at 0.68 opacity for sidebar, 0.82 for floating mobile navigation; 28px background blur; shadow `0 8px 28px rgba(24,62,52,.08)`. Implement one material system per window and avoid stacked backdrops. Native macOS materials may replace CSS blur through a host bridge; they need visual checks on the supported OS versions.

### Typography

Use the macOS system face in the released app: a system font stack beginning with `-apple-system`, rather than bundling a San Francisco font file. The Figma service advertised SF Pro but returned zero-width glyph metrics. **The reviewed editable Figma frames therefore use Manrope**, a deliberate rendering fallback. Recheck line wrapping when translating to system typography.

| Role | Size / line height | Weight |
|---|---|---|
| Display | 36 / 42 | Semibold |
| Screen title | 24 / 30 | Semibold |
| Section/question | 19 / 26 | Semibold |
| Reading text | 17 / 26 | Regular |
| Control text | 14 / 20 | Medium |
| Supporting caption | 12 / 17 | Regular |

Long explanations target a 60–75-character measure; adjust to actual math and code content. Provide text scaling. Use tabular numbers for time, cost, percentages, and model usage. A graph label is allowed to use compact text; a reading paragraph should not inherit that density.

Calculated light-theme contrast ratios: ink/white **11.81:1**; muted/white **5.52:1**; muted/canvas **5.02:1**; muted/mint **4.56:1**; accent/mint **5.47:1**; white/accent **6.62:1**. These checks cover token pairs, not every possible composited background. Test actual glass over real content and use an opaque fallback when needed.

## macOS behavior

Use a proper titlebar with traffic-light clearance, window dragging outside interactive controls, and standard File/Edit/View/Window/Help menus. The concept omits OS-drawn traffic lights; their implementation must not overlap the brand. Support multiple windows intentionally or constrain to a single primary document window with clear reopening behavior.

Keep standard text-editing shortcuts, native selection, normal Tab/Shift-Tab focus traversal, visible focus rings, Enter/Shift-Enter preference, and full keyboard access to every question type. This is a deliberate improvement over the upstream custom Tab behavior. A command menu may offer session open, new lesson/practice, model choice, graph search, and appearance without overriding expected platform editing commands.

Use a minimum 44pt activation region for major actions and touch-friendly controls in the future companion. Compact desktop controls can be visually smaller while retaining a forgiving hit area. Do not rely on color alone: selection, job state, and plan state also have text/icon indicators.

At narrower Mac window widths, collapse the inspector before shrinking the reading measure. Then make the sidebar a toggleable panel. Keep the current question and Submit available while the plan and jobs become inspector tabs/sheets. Avoid automatically resizing the user's window as a navigation side effect.

## Motion contract

Motion should expose continuity and cause. Default content is visible; animation is never a gate to reading or answering.

| Moment | Duration/behavior | Purpose |
|---|---|---|
| Hover, focus, selection | 100–140ms color/material transition | Confirm the targeted control |
| Answer selection | 120ms fill/check appearance | Make the chosen value unambiguous |
| Inspector open/close | 220–280ms spring or decelerating slide; 8–16px travel | Preserve the relation to its source |
| Lesson phase handoff | 220ms crossfade and shared position; no whole-page reset | Preserve session continuity |
| Background job completion | 180ms compact state replacement; no focus capture | Show that new material is available |
| Graph focus | 320–420ms camera interpolation; cancel immediately on user input | Follow the selected reasoning neighborhood |
| New knowledge merge | 300ms local reveal at settled coordinates | Explain where knowledge entered the map |
| Modal/sheet | 180–220ms entry, 140–180ms exit | Make temporary scope clear |

Use an ease-out reference such as cubic-bezier(0.16, 1, 0.3, 1) for short transitions. Use springs for directly manipulated shell surfaces, with bounded overshoot. No pulsing graph orbs, perpetual floating cards, typewriter text, staggered answer entrances, or celebratory animation after every answer.

For a React shell, a small Motion layer can orchestrate layout and presence. Keep graph physics and camera rendering outside React's per-node render loop; use a dedicated Canvas/WebGL renderer and stop rendering at rest. Consider Rive for a genuinely useful demonstration or optional Coqui mascot later, rather than making it a prerequisite for the basic shell. Measure dropped frames with a realistic graph and a streaming lesson before adding more visual effects.

Respect Reduce Motion and an explicit in-app preference. Replace camera travel with immediate centering, use ≤100ms fades for continuity, disable spring overshoot, and freeze ornamental movement. Respect Reduce Transparency separately. A low-graphics mode must keep graph/chain functionality available through a table/list.

## Empty, busy, and failure states to implement

| State | Required behavior/copy direction |
|---|---|
| Empty knowledge map | “Start with something you want to understand.” Offer Start learning and Import notes; do not fabricate sample knowledge in the user's graph |
| No provider configured | Identify the missing model role; preserve the goal draft; link to Connect provider |
| Selected model unavailable | Explain that the selection cannot run; let the learner choose another model without losing input |
| Diagnostic/teacher handoff | Show the phase change and live activity; keep transcript and draft in place |
| Question awaiting answer | One clear active question; labels for thinking/confidence and an explicit “I don't know yet” |
| Provider stream interrupted | Retain partial durable output and input; show Retry and provider detail |
| Research or demo failed | Local job error with Retry/Review details; the lesson remains usable |
| Extraction incomplete | Honest coverage state, source/session link, retry/cancel as appropriate; avoid implying the graph is fully updated |
| Dictation connecting/recording/finishing | Visible microphone state, meter and target field; stop/flush and cancel/discard are distinct |
| Delete session/node | State graph/provenance consequences and the recoverability policy; do not hide shared-node effects |
| Search has no matches | Keep query editable and suggest clearing filters |
| Offline | Existing local sessions/graph remain readable; provider-required actions show the connection requirement |

These state specifications are planned behavior. They are not all drawn in the four frames.

## Proposed improvements after parity

1. Add a transparent retrieval scheduler with an evidence timeline, manual snooze, and clear reasons an idea is due. Keep proposition truth separate from learner recall evidence.
2. Improve graph access through an equivalent semantic outline, source trace, and keyboard-search workflow.
3. Add a visual lesson navigator that shows phase, current question, parked work, and pending background results without masking the transcript.
4. Add local search across sessions, imported sources, propositions, and generated materials, preserving deep links to evidence.
5. Add a reviewable import pipeline with previews, duplicate handling, source boundaries, and explicit processing costs.
6. Add export/backup/restore and optional device sync only after ownership, conflict, encryption, and recovery behavior are specified.
7. Explore the iPhone companion for short review and capture after macOS parity and reliability are established.

## Verification and remaining work

The composed desktop and mobile frames were rendered and visually inspected together. The first render exposed zero-width SF Pro glyphs; all text was repaired to Manrope and checked for nonzero metrics. A measured composer height overflow was repaired. The passing render showed readable text and no visible content clipping. CoquiLearn name changes and source-accurate plan/practice labels were then rendered and checked on the affected desktop views.

Apple iOS/macOS library assets were discovered through Figma search, but imports from both applicable libraries failed with “Not permitted to upsert from library.” Local editable controls and semantic tokens are the documented fallback. The file is an original concept, not an imported Apple UI kit.

Remaining design work before release: provider/setup/settings frames; graph selection/provenance and chain-table details; all question variants; practice conclusion/retest; full error/busy/empty states; text-scaling and narrow-window compositions; native titlebar/menu integration; Dark-mode composition; screen-reader and keyboard testing; actual motion prototype and performance checks. No app implementation or runtime animation was delivered by this design task.

The durable Figma state/IDs and construction scripts are under [`artifacts/design`](../../artifacts/design). They are an evidence trail for the concept, not application source.
