# CoquiLearn parity extension: design-system evidence

Checked 2026-10-30 against the finished packaged captures and renderer source. This is an ordinary extension of the approved compact Mac interface. The existing [DESIGN.md](../../DESIGN.md) and [sidecar](../../.impeccable/design.json) remain unchanged; no new visual world, concept frame, generated comp, or system token is introduced.

## Authority and preserved system

[PRODUCT.md](../../PRODUCT.md) and the latest override at the top of [UI direction](ui-direction.md) preserve Moonforest/Dew, original coquí vectors, macOS system typography, localized glass, and fluid selection while replacing the older floating-shell composition with the compact title bar, rail, sidebar, aligned reading/composer column, and single inspector. The source cascade is `styles.css` followed by `desktop-layout.css`.

All 42 semantic theme values in the two root CSS theme blocks match the corresponding `dew-*` and `moonforest-*` DESIGN.md colors exactly. The sampled additions consume the existing semantic variables rather than creating a replacement palette. Default prose remains 15px/25px; controls retain the existing compact hierarchy and the readable 12px model trigger. The selection spring remains stiffness 180 / damping 28 / mass 1, the picker spring remains 240 / 30, and the reduced-motion and reduced-transparency paths remain present in source. Still screenshots do not establish motion performance.

The preserved named rules continue to apply: stable reading, measured context attachment, and honest evidence/fixture states. New structured rows, tables, source groups, and diagrams serve actual learning or provenance functions.

## Extension comparison

| Finished addition | Incumbent system relationship | Checked evidence |
| --- | --- | --- |
| Paginated session history, kind filter, search and actions | Extends the same persistent sidebar, soft search field, selected lens and outline icons. The new title/status/date rows use a scoped 46px two-line variant; the recorded 34px single-line session primitive remains unchanged. | `SessionHistory.tsx`; `.history-*` rules; fresh lesson, plan and narrow-sidebar captures |
| Frozen plan snapshots, inspector preview and focus | Semantic SVG strokes, fills and text use existing ink/muted/accent/surface roles. The inline preview is bounded at 260px high and does not enlarge its natural geometry to transcript width. The inspector retains its 200px diagram; the separate focus dialog keeps natural-size zoom/pan/fit. | `LearningPlan.tsx`; `.learning-plan-svg`, `.plan-snapshot`, `.plan-inspector-preview`, `.plan-focus-*`; three `plans-*` captures |
| Chain hierarchy, search/sort, selection and bulk actions | Uses existing compact inputs, source/chain disclosure, thin dividers, native checkboxes, muted metadata and rose destructive action text. The 90-idea fixture retains all selected ideas. | `ChainBrowser.tsx`; `.chain-*` and `.reasoning-chain` rules; three `chains-*` captures; packaged parity assertions |
| More than 64 ideas selected for learning | Validation occupies a reserved row inside the originating home composer, announces with `role="status"`, and disappears when the selection is valid or the view is left. Primary and bulk actions stay visible. | `App.tsx` start guard and home composer; `.home-context-validation`; chain and subsequent Library captures |
| Per-file import selection, retry and source inspection | Extends the quiet Library grouping with actual file names/previews, textual state pills, localized recovery and an announced result count. Source viewing uses an existing dialog/reading treatment. | `ImportWorkbench.tsx`, `SourceViewer.tsx`; `.import-result` and `.source-*`; three `import-results-*` captures; packaged parity assertions |
| Account and independent thinking preferences | Retains Settings tabs, provider groups, standard fields and explicit connection truth states; global preferences do not overwrite existing sessions. | `Settings.tsx`, session model/usage disclosure in `App.tsx`; fresh Connections capture; packaged parity assertions |
| Phases, usage and background activity detail | Keeps phase labels in transcript context and progressive disclosure in the single inspector. Usage tables retain 12px controls, tabular numbers, semantic dividers and truthful subscription/unpriced labels. | `App.tsx`, `BackgroundWork.tsx`, `UsageDetails.tsx`; `.background-work-row`, `.work-meta`, `.usage-*`; source and named functional evidence |

## Final visual evidence

All sixteen supplied final screenshots were opened and inspected:

- Seven shell states in [`.impeccable/review/`](../../.impeccable/review/): `desktop.png`, `desktop-question.png`, `desktop-dew.png`, `connections.png`, `model-picker.png`, `narrow.png`, and `narrow-sidebar.png`.
- Nine extension states in [`artifacts/implementation/parity/`](../../artifacts/implementation/parity/): `plans-{moonforest,dew,narrow}.png`, `chains-{moonforest,dew,narrow}.png`, and `import-results-{moonforest,dew,narrow}.png`.

The shell desktop captures are 3024×1786 physical pixels (1512×893 CSS at DPR2). Extension desktop captures are 2880×1786 (1440×893 CSS); narrow captures are 1800×1440 (900×720 CSS). These are Mac window sizes. The narrow import page continues below the viewport through normal page scrolling; its screenshot does not show the footer and does not claim a fixed footer.

The [finish review](../../.impeccable/review/parity-finish-review.md) identified two bounded defects: an oversized inline plan and global context-limit validation overlapping unrelated controls. The [verdict](../../.impeccable/review/parity-verdict.md) scores both resolved and returns `ship` for those fixes only. The fresh captures agree: the latest complete three-node plan, its caption and anchored composer fit together in both themes and narrow; the 90-idea warning has reserved space; subsequent Library states show no stale graph warning. An earlier plan snapshot above the latest one is partly outside the scrolled transcript viewport, rather than clipped within its own SVG.

The retained [layout measurements](../../.impeccable/review/layout-metrics.json) record the 44px title bar, 52px rail, 236px sidebar, 800px reading container, 300px inspector, 15px/25px prose, zero horizontal overflow, 12px model trigger and measured 8px popover gap. Source and fresh screenshots retain that shell hierarchy. Measurements from the 1512px shell sample are not fixed coordinates for the 1440px extension samples.

## Scope, drift and limits

No new system-level drift was found in the sampled additions. The older Figma document's floating-shell geometry, larger radii and reading-fill instructions remain historical material references where the accepted compact override and renderer differ; this pass does not repair or promote those older choices. The scoped 46px session-history variant and 260px plan-preview bound are component facts, not new global primitives.

Not canonized or repaired: historical Figma/runtime differences and any unexamined pre-existing implementation details. No craft-floor defect is added to the design rules to legitimize the finished additions. DESIGN.md and `.impeccable/design.json` were preserved byte-for-byte.

Functional evidence is separate: [`packaged-acceptance.json`](../../artifacts/implementation/packaged-acceptance.json) has 21 passing packaged runtime/recovery checks, [`parity/acceptance.json`](../../artifacts/implementation/parity/acceptance.json) has 18 passing packaged checks with no errors, and [`setup-acceptance.json`](../../artifacts/implementation/setup-acceptance.json) has three passing packaged setup checks. All three reports record `packaged:true` and `passed:true`. These are named assertions, not a complete baseline certificate. Live providers, manual accessibility, native lifecycle and performance limits remain governed by [build verification](../implementation/verification.md). This documentation pass performs no new browser, live-provider, VoiceOver or performance run.
