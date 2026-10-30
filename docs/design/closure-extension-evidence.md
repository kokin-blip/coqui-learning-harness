# CoquiLearn 0.2.1 closure extension: design evidence

Documented 2026-10-30 from the renderer source and the fresh [finish review](closure-finish-review.md). This ordinary functional extension adds deletion history, focused figure inspection, explicit context-picker completion, and practice metadata within the approved compact Mac interface. The reviewer returned **9/10 — ship** for these four visible additions, with no material fixes. This verdict does not certify the entire release.

## Authority and preserved system

[PRODUCT.md](../../PRODUCT.md), [DESIGN.md](../../DESIGN.md), its [sidecar](../../.impeccable/design.json), and the accepted override at the top of [UI direction](ui-direction.md) remain the authority. Moonforest/Dew, macOS system typography, original coquí vectors, localized glass, the full-width title bar, compact rail/sidebar, aligned reading column and anchored composer, and single inspector continue unchanged. The stylesheet order remains `styles.css` followed by `desktop-layout.css`.

The sampled additions reuse existing semantic ink, muted, soft, accent and material roles, outline icons, compact action groups, settings rows and disclosure. The existing Stable Reading, Context Attachment and Evidence rules still apply. No replacement palette, type scale, material recipe, motion policy or system primitive is introduced. `DESIGN.md` and `.impeccable/design.json` were preserved byte-for-byte.

## Controls and component bounds

| Addition | Source-grounded behavior and bounds | Relationship to the incumbent system |
| --- | --- | --- |
| Recently deleted | Settings → Data lists each deletion's title, local date/time, idea count and labeled Restore action. An empty message replaces absent rows; Show older deletions appears when another page is available. Restoration confirmation is localized. | Uses the existing settings section and row: 52px minimum row height, 10px vertical padding, 20px gap, 13px row text and 11px metadata in the current cascade. No separate recovery dashboard or new action hierarchy. See [Settings.tsx](../../apps/desktop/renderer/components/Settings.tsx) and the shared settings styles. |
| Focus figure | The existing artifact toolbar opens a titled dialog with separate Close, zoom out, percentage, zoom in and Fit figure controls. Dialog width is `min(1050px, calc(100vw - 48px))`; its shared maximum height is `calc(100vh - 64px)` with scrolling. The stage reuses the plan-focus viewport: `min(62vh, 650px)` high, 280px minimum, 12px corners and clipped overflow. Loaded natural image dimensions drive sizing. The inline figure remains natural-sized with `max-width:100%`. | Reuses the shared mist dialog, outline icons and grouped controls rather than changing lesson composition. The figure image's local white backing is content isolation, not a new application palette token. See [FigureFocus.tsx](../../apps/desktop/renderer/components/FigureFocus.tsx), [Artifact.tsx](../../apps/desktop/renderer/components/Artifact.tsx) and [desktop-layout.css](../../apps/desktop/renderer/desktop-layout.css). |
| Context picker | In selection mode, the map footer groups the chosen count, Clear and Done choosing. It remains present even with zero picks. The Delete chosen action belongs to the non-picker branch. | Extends the existing map footer and wrapping inline action group. Completion stays distinct from graph deletion. The review shows all three controls together at desktop and narrow sizes. See [KnowledgeMap.tsx](../../apps/desktop/renderer/components/KnowledgeMap.tsx) and the shared footer/action styles. |
| Practice details | A native `details`/`summary` disclosure beneath the problem exposes recorded mode and target ideas, then hint rung, miss classification and retest when those conclusion fields exist. Target IDs resolve to concept names where available. Absent fields are omitted; recorded null values receive explicit No hints/No miss recorded text. The source does not set `open`. | Uses progressive disclosure and a definition list; problem and active reasoning remain primary. It creates no new type or card primitive. See [PracticeMetadata.tsx](../../apps/desktop/renderer/components/PracticeMetadata.tsx) and its placement in [App.tsx](../../apps/desktop/renderer/App.tsx). |

Figure zoom delegates to the existing [shared pan/zoom geometry](../../packages/engine/components/pan-zoom.ts): Fit computes a viewport-dependent floor with 16px breathing room and a 150% fit cap; zoom is capped at 400%. Source supplies pointer panning, cursor-centered wheel zoom and focused-stage `0`, `+`/`=`/`-` and arrow-key controls. These are implementation facts, not interaction results from this documentation pass. Likewise, source wiring for inversion, restoration, disclosure defaults and picker completion does not establish persistence or keyboard/accessibility acceptance.

## Reviewed visual evidence

The fresh reviewer opened all twelve final packaged 0.2.1 captures under [`artifacts/implementation/closure/`](../../artifacts/implementation/closure/):

- `deletion-history-{moonforest,dew,narrow}.png`
- `figure-focus-{moonforest,dew,narrow}.png`
- `context-picker-{moonforest,dew,narrow}.png`
- `practice-metadata-{moonforest,dew,narrow}.png`

Desktop captures are 2880×1786 physical pixels; narrow captures are 1800×1440. The narrow states are Mac window adaptations, not phone evidence. The reviewer found the compact type, soft fills, restrained glass and forest-tinted grounds consistent with the incumbent system. Populated deletion rows keep their metadata and action together; Moonforest records the post-restore empty history and confirmation. Figure controls retain viewport clearance at the shown 150%. Context completion remains adjacent to count and Clear without a competing deletion action. Practice details stays subordinate while the reasoning dock remains visible.

The black rectangle labeled “Isolated figure” is intentional figure fixture content. The offline fixture label and scripted provider failure identify the packet as test evidence. They do not show a live-provider failure or certify live inference. This documenter pass relies on the fresh review for visual inspection and performs no new browser session, captures or polish loop.

## Acceptance boundary and handoff

The final native acceptance run passed all 19 closure checks against packaged 0.2.1. [`scripts/closure-acceptance.mjs`](../../scripts/closure-acceptance.mjs) is the acceptance entry point and writes [`closure/acceptance.json`](../../artifacts/implementation/closure/acceptance.json). The report records the exact application payload hash and zero renderer errors. A passing packaged result requires the final report to record `packaged:true`, `passed:true` and no errors; only its named assertions support the exercised behavior.

Still images do not certify dragging/panning, zoom limits or Fit, inversion correctness, restoration across restart, disclosure defaults, keyboard operation, focus return, assistive technology, animation, or performance. Source inspection also does not close those checks. Live providers and manual accessibility remain governed by [build verification](../implementation/verification.md), independently of the scoped visual ship verdict.

No new system-level drift or material craft defect was identified within the four reviewed controls. Historical Figma/runtime differences remain as previously recorded; they were neither repaired nor promoted into new system rules. The figure viewport limits and settings-row reuse are component facts, not changes to the global design system.
