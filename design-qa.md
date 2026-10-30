# CoquiLearn desktop layout QA

Status: the compact-layout revision passed its scoped review. The 2026-10-30 parity extension also has a `ship` verdict for its two scored finish fixes after one correction batch. The 0.2.1 closure extension has a fresh **9/10 — ship** visual verdict for its four reviewed controls, with no material fixes; native acceptance is separately ongoing. This is visual/spacing QA, not a full parity, live-provider, VoiceOver or motion-performance certification.

## Reference and normalization

The user's screenshot is the latest composition authority. Original: `codex-clipboard-83f84556-daa4-4ebd-9ef6-03eff4b5dcad.png`, 3024×1898 pixels, inferred DPR2 → 1512×949 CSS pixels. It is kept privately under `artifacts/design/references/` and excluded from source/distribution. Its unrelated chats and project names are not copied into CoquiLearn.

The shell's final native webContents captures are 3024×1786 pixels, viewport1512×893, DPR2. macOS clipped the requested949px window height to the available screen. The parity-extension desktop captures are 2880×1786 pixels, viewport1440×893; narrow captures are1800×1440, viewport900×720. Compare composition and bottom anchoring relative to each actual viewport. The native traffic lights are outside the webContents capture; main positions them at14/15 inside hiddenInset chrome. No exact-height or native-refraction identity is claimed.

The original and implementation were opened together for direct comparison; every final capture was opened and checked after animations/fonts settled. States are synthetic teaching data in a labeled fixture library. The source reference has a long activity transcript; the target has a short lesson/feedback transcript, so equal content density is not a meaningful text-copy goal.

## Full-view and focused comparison

| Region | Final measured behavior | Comparison/result |
|---|---|---|
| Header and navigation |44px full-width titlebar;52px destination rail;236px sidebar | Replaces the former floating shell with the requested compact desktop setup |
| Reading field |800px container; text x376,708px available width;15px/25px system prose | Central reading starts near the same source x-position (~377px); stable line length and generous side clearance |
| Composer |x376,width708,height112,bottom16px | Shares transcript alignment; anchored while transcript scrolls, rather than moving with lesson content |
| Inspector |x1196,y60,width300; one progressively disclosed panel | Matches the source's single upper-right context panel, adapted to learning path/work/sources/usage |
| Questions | Persistent dock grows upward with answer/thinking/confidence controls | Deliberate functional adaptation; long form can scroll, reading context remains visible |
| Narrow900×720 | Inspector yields; sidebar toggles as an overlay; composer remains in viewport | No horizontal document overflow or model/microphone/action overlap |
| Theme | Moonforest and Dew, Coqui graphics and forest-tinted glass | Approved difference from the source's purple Codex branding |
| Model control |12px label; measured8px popover gap with viewport clamping | Contextual popover remains attached for the actual empty-catalog height |

Focused inspection covered sidebar row rhythm, titlebar/control gutters, reading/composer shared edges, model label/microphone/action spacing and inspector separators. The deliberate title/lesson data differs, while spacing and setup follow the reference. The Figma design remains a material/brand reference; its older spatial shell is explicitly superseded in the UI specification.

## Findings and fixes

| Severity | Finding | Final state |
|---|---|---|
| P2 | Wide-window session navigation hid the sidebar when opening a lesson | Fixed; sidebar remains visible at desktop widths |
| P2 | Sidebar inherited excess height from the old layout | Fixed; rail/sidebar both fill the849px region beneath header |
| P2 | Composer model label was10px | Fixed to12px; native900px capture verifies fit |
| P2 | Model popover used a fixed360px height estimate and detached on an empty catalog | Fixed with measured-height anchoring/resize observation; measured gap8px |
| P2 | Title breadcrumb animated layout margin | Static detector finding resolved by removing that transition |

No open P0/P1/P2 findings remain in this layout revision. The fresh reviewer disposition after the original review was `fix`; the verdict pass scored both named fixes resolved and returned `ship` at that scope. It is not an independent audit of every implementation feature.

## Evidence

`artifacts/implementation/layout/` contains the desktop, question, Dew, model-picker, Connections, narrow and narrow-sidebar captures, measured geometry, original review and verdict. `scripts/capture-layout.mjs` reproduces the batch in an isolated fixture library. Assertions check zero page errors, no horizontal overflow, model font12px, viewport clamping, gap8px and narrow composer bounds. One CSS detector ran; no second pass. No generated raster assets were introduced by this revision. Runtime Coqui vectors retain their Figma asset manifest; the native icon derives from the same mark via `scripts/icon.mjs`.

Functional verification, actual performance and unverified live-service/manual checks are listed separately in `docs/implementation/verification.md`.

## Parity extension finish, 2026-10-30

This is an ordinary extension of the approved compact interface. The new session pagination/filter/search, plan SVG snapshots/inspector/focus, chain hierarchy/search/sort, per-file import selection/retry/source inspection, account/thinking preferences, and phase/usage/activity details retain the established shell, Moonforest/Dew, macOS typography, localized glass and selection motion policy. `DESIGN.md` and `.impeccable/design.json` are preserved unchanged. The source-to-system comparison, component-specific geometry and evidence boundaries are recorded in [`docs/design/parity-extension-evidence.md`](docs/design/parity-extension-evidence.md).

| Scored finding | Final correction and evidence |
| --- | --- |
| Inline plan snapshot enlarged natural nodes and lettering to transcript width | Snapshot now uses natural SVG dimensions, `max-width:100%` and preview-only `max-height:260px`. Complete latest three-node plans fit with caption/prose/composer in `plans-moonforest.png`, `plans-dew.png` and `plans-narrow.png`. The 200px inspector preview and separate natural-size zoom/pan/fit focus remain intact. |
| Global >64-selection notice covered composer actions and persisted into Library | The announced warning now has a reserved local composer row while more than64 ideas are selected. The90 selected ideas, Start learning, Clear and Delete chosen remain visible in all three `chains-*` captures. All three subsequent `import-results-*` captures contain no unrelated graph warning; desktop import actions and result count are unobscured. |

All sixteen latest supplied captures were opened and inspected: the seven fresh shell states in `.impeccable/review/`, plus the nine plan/chain/import-result states in `artifacts/implementation/parity/`. Normal Moonforest/Dew reading, the expanded active question, disconnected Connections, model-picker empty state and900px sidebar adaptation remain consistent with the incumbent design. The narrow import page scrolls normally; its footer is below that captured viewport.

`.impeccable/review/parity-finish-review.md` requested only the two corrections above. `.impeccable/review/parity-verdict.md` scores both resolved and returns `ship` for those fixes; no second detector or new visual direction is implied. Retained layout metrics report zero horizontal overflow, the corrected12px trigger and an8px popover gap. This documenter pass checked source policy for retained motion/accessibility alternatives; it did not record new motion or perform manual assistive-technology testing.

Functional records separately contain21 passing packaged runtime/recovery checks,18 passing packaged parity checks and3 passing packaged setup checks; each report records `packaged:true` and `passed:true`. Their named assertions support the exercised behavior; the scoped visual verdict does not close unasserted baseline clauses or unavailable live/manual checks. See `docs/implementation/verification.md` for those boundaries.

## 0.2.1 closure extension handoff, 2026-10-30

The fresh [closure finish review](docs/design/closure-finish-review.md) returns **9/10 — ship** for Recently deleted, Focus figure, context-picker completion and Practice details, with no material fixes. This is an ordinary extension of the approved compact shell. `DESIGN.md` and `.impeccable/design.json` remain byte-for-byte unchanged; Moonforest/Dew, Mac system typography, localized glass, anchored composer, single inspector and existing motion policy remain authoritative. Source relationships, component bounds and evidence limits are recorded in [closure extension evidence](docs/design/closure-extension-evidence.md).

| Surface | Scoped visual handoff |
| --- | --- |
| Recently deleted | Keep title, deletion time, idea count and quiet Restore action together; retain the explicit empty and confirmation states. |
| Focus figure | Keep isolated content, the compact zoom/percentage/Fit toolbar and separate Close action within the existing bounded dialog. |
| Context picker | Keep count, Clear and Done choosing adjacent; picker completion has no competing Delete chosen action. |
| Practice details | Keep recorded metadata in the subordinate disclosure beneath the problem while the active reasoning dock remains available. |

The fresh reviewer opened all twelve packaged captures in `artifacts/implementation/closure/`: each surface in Moonforest, Dew and a narrow Mac window. Desktop images are 2880×1786; narrow images are 1800×1440. The black “Isolated figure” fixture is intentional. Narrow captures show desktop adaptation, not a phone layout. No new screenshots or runtime changes were made for this documentation handoff.

The final native closure run separately passed 19 named checks, with packaged:true, passed:true and zero renderer errors. Its payload hash matches the other final acceptance lanes. [scripts/closure-acceptance.mjs](scripts/closure-acceptance.mjs) writes the final [closure acceptance report](artifacts/implementation/closure/acceptance.json). Treat it as a packaged pass only when `packaged:true`, `passed:true` and no errors are recorded. Still images do not verify panning/zoom/Fit, inversion or restart persistence, disclosure defaults, keyboard/focus behavior, assistive technology, motion performance or live providers. Those remain separate functional and manual checks under [build verification](docs/implementation/verification.md).
