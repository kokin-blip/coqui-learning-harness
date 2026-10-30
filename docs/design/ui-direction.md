> **Layout update accepted 2026-10-29:** the user’s Codex screenshot now guides desktop spacing and composition: a slim destination rail, compact session sidebar, a full-width title bar, a centered reading column with an anchored composer, and one right inspector. Existing CoquiLearn colors, materials, typography, and fluid selection behavior remain in use. This overrides the earlier floating shell’s spacing and panel arrangement.

# CoquiLearn UI direction

Updated 2026-10-29. **macOS is the first release platform.** The Figma frames are editable design references with linked navigation, control states, and an authored motion study; their lesson data is illustrative. A functioning Electron implementation now exists. The latest layout update above takes precedence over the earlier floating composition; runtime verification is recorded in docs/implementation/verification.md.

[Open the Figma design](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt). The Figma document was initially named “Coqui — Learning Studio”; all on-canvas branding is now **CoquiLearn**. The connector does not support renaming the document. Its desired title is **CoquiLearn — Learning Studio**.

## The visual idea

CoquiLearn should feel like a quiet learning instrument with the material polish of a Mac app. The user's [Apple Music macOS kit](https://www.figma.com/design/Gz7WEiN8Y3Vvivvae0ZPlP?node-id=115-2) is the glass reference. Its Native Fidelity Lab contains actual refractive `GLASS` effects for chrome, controls, and content. The observed effect recipes are recreated as local editable styles, then extended for CoquiLearn. Cross-file imports of those local component/style keys returned “not found”; these are not linked library instances.

The palette takes its soft tonal approach from [Catppuccin](https://catppuccin.com/palette/) and uses original Coquí colors: leaf green, pond teal, mist blue, orchid, blush, and guava. **Moonforest** is the dark composition; **Dew** is the light composition. These are custom themes, not official Catppuccin flavors. The lesson, question, and reasoning carry the visual weight; restrained glass chrome supports them.

Glass has a functional boundary: sidebar, compact toolbar, popovers, small controls, and floating navigation. Reading regions use a 97% surface fill and restrained frost rather than strong refraction. Questions, tables, citations, and long-form notes stay stable. Avoid moving or refracting text behind the learner's active reading area. Respect the macOS Reduce Transparency preference with an opaque material replacement.

This direction interprets the user's “iOS glassy” request as a material and interaction influence for a Mac app. It does not impose phone navigation or touch-only controls on the desktop.

## Editable screens

| Frame | Purpose | Figma | Local preview |
|---|---|---|---|
| Home · Knowledge map | Start from a question or connected knowledge; show selected context before sending | [Home](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-2) | [home.png](../../artifacts/design/home.png) |
| Learn · Adaptive lesson | One active learning step, structured answer, thinking, confidence, visible path, and background work | [Lesson](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-137) | [lesson.png](../../artifacts/design/lesson.png) |
| Practice · Retrieval and review | A self-contained problem with reasoning input; separate a proposed recall queue from baseline practice | [Practice](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-305) | [practice.png](../../artifacts/design/practice.png) |
| Future iPhone companion · Review | Explore short retrieval sessions after macOS; no commitment to mobile for the first release | [Future companion](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=3-420) | [mobile.png](../../artifacts/design/mobile.png) |
| Learn · Adaptive lesson · Dew | Verify the same lesson in the light theme | [Light lesson](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=15-235) | [lesson-light.png](../../artifacts/design/lesson-light.png) |
| Glass & palette | Three source material recipes and three CoquiLearn extensions | [Materials](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=16-11) | [materials.png](../../artifacts/design/materials.png) |
| Motion · selection to focus | Selection lens, related context tray, and action press | [Motion study](https://www.figma.com/design/sch5j9lMwSeR9voAHt3LMt?node-id=16-85) | [MP4](../../artifacts/design/glass-motion.mp4) |

The four desktop compositions are 1440 × 960. The future companion is 390 × 844. Material and motion studies are 1440 × 820. All frames consist of editable text, frames, vector paths, and local control instances. No screenshot is used as a design layer.

The foundation contains 32 primitive color/material variables, 32 semantic aliases, 11 geometry variables, Light/Dark modes, six shared text styles, seven material effect styles, and a five-variant local button family: primary, secondary, hover, pressed, and disabled. Material variables include alpha so the glass strength survives theme resolution and exports. Component construction assets sit outside the review frames. Original frame IDs are preserved; earlier previews are archived under `artifacts/design/v1`.

Sidebar Map/Learn/Review navigation and the Home start action link the desktop concepts. The lesson appearance control switches between Moonforest and Dew. Button hover/press state changes are authored. Other product controls illustrate future behavior and are not implemented learning actions.

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

The Figma collections are named `CoquiLearn / Palette`, `CoquiLearn / Theme`, and `CoquiLearn / Geometry`. Semantic colors alias primitives and expose web code syntax. Moonforest is reviewed on Home, Learn, Practice, and the future companion; Dew is reviewed on the lesson composition. Mode names remain Light and Dark for implementation mapping.

| Semantic token | Light | Dark | Use |
|---|---|---|---|
| `--color-canvas` | `#EBF0EB` | `#172127` | Workspace background |
| `--color-surface` | `#FAFCF7` | `#202D34` | Reading/response surfaces |
| `--color-surface-soft` | `#E0E9E2` | `#293940` | Quiet grouped region |
| `--color-ink` | `#253C35` | `#DDEDE5` | Main text |
| `--color-muted` | `#526D63` | `#ACC4BB` | Supporting text |
| `--color-accent` | `#316A49` | `#A9D9A0` | Primary action/active context |
| `--color-accent-soft` | `#CFE3D3` | `#304B42` | Selection background |
| `--color-on-accent` | `#F5FAF1` | `#17291D` | Text on primary action |
| `--color-line` | `#B9CEC0` | `#4A655E` | Dividers/graph links |
| `--color-warning` | `#855B29` | `#EDC99C` | Recoverable attention state |
| `--color-warning-soft` | `#F4E7D4` | `#4A3E30` | Attention surface |
| `--color-lilac` | `#80709B` | `#C9BFE8` | Orchid topic accent |
| `--color-teal` | `#327A72` | `#96D5C5` | Pond topic accent |
| `--color-sky` | `#4A708B` | `#ABCDDF` | Mist topic accent |
| `--color-rose` | `#9B586B` | `#E5B4C4` | Coquí blush topic accent |
| `--color-peach` | `#A36042` | `#EBBEA0` | Guava topic accent |

Spacing values: **4, 8, 12, 16, 24, 32, 48**. Structural radii: **12** for input/answer groups, **20** for reading regions, **28** for glass shell, and **999** for compact pills. Use consistent radii by role; do not make every content paragraph a card.

The following are actual Figma GLASS parameters. Each refractive style also has a restrained inner highlight and drop shadow. Keep these as design references; CSS blur alone does not reproduce Figma's refraction.

| Material | Frost radius | Refraction | Depth | Light intensity | Use |
|---|---|---|---|---|---|
| Kit chrome | 22.5 | .06 | 4 | .28 | Source recipe |
| Kit control | 15 | .12 | 7 | .42 | Source recipe |
| Kit content | 45 | .06 | 4 | .28 | Source recipe |
| Canopy | 26 | .085 | 5 | .38 | Navigation and floating chrome |
| Lens | 12 | .18 | 10 | .54 | Small controls and focused selection |
| Mist | 32 | .035 | 3 | .22 | Quiet inspectors |

Reading uses background blur 18 with 97% surface fill and no bright rim. Current material fills are chrome .52, lens .36, mist .72, and reading .97; default edge alpha is .13 in Moonforest and .65 in Dew. Theme-aware literal fallbacks accompany bindings for consistent static exports. Avoid stacked large backdrops. Native macOS materials or a localized rendering effect need a hardware/OS spike before promising exact Figma parity.

### Typography

Use the macOS system face in the released app: a system font stack beginning with `-apple-system`, rather than bundling a San Francisco font file. The Figma service advertised SF Pro but returned zero-width glyph metrics. **The reviewed editable Figma frames now use Inter**, matching the source kit's practical fallback. It replaces the earlier Manrope draft. Use only Regular, Medium, and Semi Bold; recheck wrapping when translating to system typography.

| Role | Size / line height | Weight |
|---|---|---|
| Display | 32 / 40 | Semibold, −0.6px tracking |
| Screen title | 24 / 30 | Semibold |
| Section/question | 18 / 25 | Semibold, −0.15px tracking |
| Reading text | 17 / 26 | Regular |
| Control text | 13.5 / 20 | Medium |
| Supporting caption | 12 / 17 | Regular |

Long explanations target a 60–75-character measure; adjust to actual math and code content. Provide text scaling. Use tabular numbers for time, cost, percentages, and model usage. A graph label is allowed to use compact text; a reading paragraph should not inherit that density.

Calculated base-token contrast ratios, Dew / Moonforest: ink/surface **11.45 / 11.65**; muted/surface **5.46 / 7.65**; muted/canvas **4.88 / 8.86**; accent/accent-soft **4.74 / 5.93**; on-accent/accent **6.03 / 9.57**; muted/surface-soft **4.54 / 6.48**. These cover uncomposited token pairs, not every glass background. Test actual composites over real content and use an opaque fallback when needed.

### Graphics and control craft

Use one outline-icon grammar: rounded joins/caps, mostly 18px graphics inside 24px regions, and 1.5–1.75px strokes at native design size. The 28px app badge contains an original symmetric vector coquí mark. Knowledge nodes use consistent authored concept symbols, curved directional connections, and a clear selected-node hierarchy. Keep vector graphics editable; avoid emoji, mixed icon fonts, or decorative bitmap UI.

Radio selection uses a single centered dot. Path status icons are centered within equal circles. The practice layout aligns its problem and inspector at the same top edge, with a compact row of givens and unclipped actions. Preserve these alignments when real content replaces illustrative text.

## macOS behavior

Use a proper titlebar with traffic-light clearance, window dragging outside interactive controls, and standard File/Edit/View/Window/Help menus. The traffic-light shapes in the concept are visual placeholders; implementation uses native window controls with the same reserved clearance. Support multiple windows intentionally or constrain to a single primary document window with clear reopening behavior.

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

The revised 3.2-second Figma study uses a 660ms selection glide (−64px to 0), with a small surface stretch that settles at 1.06s. A 720ms context tray arrival starts while the lens is moving: 16px travel, .992→1 scale, and .88→1 opacity keep its content readable. The action depresses to .985 scale in 120ms and releases over 360ms. Selection uses cubic-bezier(.32, 0, .18, 1); settling uses (.22, 1, .36, 1). The longer focal study demonstrates material continuity; routine feedback remains quick.

In application code, play once in response to an action and remain interruptible; do not copy an automatically generated infinite loop. Screen navigation uses 440ms Smart Animate; appearance changes use a 320ms dissolve. Button hover is 180ms, press 100ms, and release 240ms. The new delivery preview is [60 fps](../../artifacts/design/glass-motion-fluid-60fps.mp4), replacing the earlier 10 fps diagnostic preview. It is the authored Figma render, not interpolated video.

The Figma service retained transform/opacity tracks but did not retain attempted GLASS-effect keyframes. The material highlight is therefore static. The exported MP4 demonstrates movement of glass surfaces, not animated refraction parameters. Reduce Motion and Reduce Transparency are specified implementation policies, not working OS preference listeners in this concept.

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

These state specifications are planned behavior. They are not all drawn in the current frames.

## Proposed improvements after parity

1. Add a transparent retrieval scheduler with an evidence timeline, manual snooze, and clear reasons an idea is due. Keep proposition truth separate from learner recall evidence.
2. Improve graph access through an equivalent semantic outline, source trace, and keyboard-search workflow.
3. Add a visual lesson navigator that shows phase, current question, parked work, and pending background results without masking the transcript.
4. Add local search across sessions, imported sources, propositions, and generated materials, preserving deep links to evidence.
5. Add a reviewable import pipeline with previews, duplicate handling, source boundaries, and explicit processing costs.
6. Add export/backup/restore and optional device sync only after ownership, conflict, encryption, and recovery behavior are specified.
7. Explore the iPhone companion for short review and capture after macOS parity and reliability are established.

## Verification and remaining work

All seven current frames were rendered and visually inspected after the material, typography, and graphics pass. Each uses Inter only, with zero zero-width text nodes, zero image fills, and no text extending outside its immediate parent bounds. After the user's fluidity feedback, the revised motion export was verified as 960×546 H.264 at 60 fps and inspected at 0, .45, .65, .96, 1.77, and 2.3 seconds. The changed motion labels fit their containers. Primary/selected text, radio alignment, directional graph attachments, practice actions, and light-theme reading contrast were checked in the final previews. These are design-level checks, not runtime keyboard or assistive-technology validation.

The earlier concept used local controls after Apple library imports were denied. This revision separately inspects the user's supplied Apple Music kit: chrome `116:165`, control `116:167`, and content `116:169` on page `115:2`. Their numeric effect recipes are the new material base. Cross-file import keys were unavailable, so local styles reproduce the observed recipes and record provenance; the source file was not edited. CoquiLearn layout, typography, icons, palette, and additional materials remain locally editable.

Remaining design work before release: provider/setup/settings frames; graph selection/provenance and chain-table details; all question variants; practice conclusion/retest; full error/busy/empty states; text-scaling and narrow-window compositions; native titlebar/menu integration; light Home/Practice compositions; screen-reader and keyboard testing; production material fidelity and performance checks. Linked navigation and a motion study are delivered; no app implementation or runtime animation is delivered by this design task.

The durable Figma state/IDs and construction scripts are under [`artifacts/design`](../../artifacts/design). They are an evidence trail for the concept, not application source.
