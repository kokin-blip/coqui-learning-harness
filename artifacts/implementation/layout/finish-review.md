disposition: fix

Inputs: This is an established-world, code-led update; no generated comp, quality-bar card, or rolled concept contract applies. The supplied screenshot is the composition authority and `docs/design/ui-direction.md` is the retained-world authority. Motion was reviewed from source and the supplied acceptance record, not from a motion capture. Upstream feature parity and live-provider behavior are outside this visual review.

## persistence

Pass. `PRODUCT.md` exists and records the Electron/macOS platform and approved visual world. `docs/design/ui-direction.md` opens with the latest screenshot-led composition override. No comp-round state or raster-plate obligation applies to this code-led change.

Evidence passes: all seven named target captures exist, open correctly, contain the named state, and show no blank or malformed regions. Desktop captures are 3024×1786 pixels (1512×893 CSS at DPR 2); narrow captures are 1800×1440 (900×720 CSS at DPR 2). The reference is 3024×1898. The desktop height difference is disclosed, and the composer anchors to the actual captured bottom. Native traffic lights are outside webContents screenshots; the inspected main-window code uses `hiddenInset`, 94px renderer clearance, and traffic-light position x14/y15. No second detector ran; the reported breadcrumb margin transition is absent from the inspected final rule.

## fidelity

Reference inventory: full-width compact title bar; a slim destination rail; adjoining dense session sidebar; a long central transcript with substantial horizontal inset; a bottom-anchored composer; and one rounded inspector at the upper right. The reference's purple color, conversation text, activity list, and exact content density are not CoquiLearn requirements.

| Element / promise | State | Evidence |
|---|---|---|
| Desktop topology and reading order | match | 44px title bar, 52px rail, 236px sidebar, central lesson, one 300px inspector. Measured reading text begins at x376, matching the requested composition. |
| Central reading and bottom composer | match | Transcript stays in the reading column; composer shares its left and right alignment and retains a 16px bottom inset. Sparse fixture content accounts for the open space; adding copied Codex activity would be false content. |
| Session navigation | match | Compact sidebar, active-session row, quiet grouping, New session, local-storage state, fixture label, and footer Settings are visible without competing panels. |
| Question dock | adaptation | The active form grows upward and leaves transcript context visible; answer options, thinking, confidence, explicit uncertainty, Skip, and Submit remain present. This is required by the supplied learning-form truth rather than the reference's single chat textarea. |
| Single inspector | match | Path, background work, sources, extraction, and model/usage share one upper-right surface with restrained separators and progressive disclosure. |
| Narrow behavior | adaptation | At 900px the inspector yields, the 48px rail remains, and the sidebar becomes a toggleable overlay. This follows the narrow-window policy in the direction document; composer and reading remain unclipped. |
| TYPE: system typography and hierarchy | adaptation | macOS system typography is expressly approved despite the general craft-floor default. 15/25px reading text and 20/28px title fit the compact request; prose is capped at 75ch. The separate model-control exception below remains unresolved. |
| Composer model-control readability | contradicted | The meaningful model selection is reduced to 10px in `desktop-layout.css` (`.composer-model-control .model-picker-trigger`). It is visibly smaller than surrounding controls in both desktop themes and the narrow capture, below the direction's 13.5px control/12px supporting hierarchy. |
| Model popover attachment | contradicted | `model-picker.png` places the approximately 160px-tall empty-result popover roughly 200 CSS px above its trigger. `ModelPicker.tsx` subtracts a fixed 360px rather than anchoring the actual surface height. The detached surface loses the cause-and-effect relationship of a contextual model picker. |
| MATERIAL: restrained glass | match | Forest chrome, soft controls, thin highlights, and localized blurred popovers/dock preserve the approved material language. Reading text remains stable on an unadorned field. No imitation illustration, decorative texture, or raster substitution appears. Exact Figma refraction is not claimed. |
| GROUND: Moonforest / Dew | match | Both captures keep the prescribed cool forest and pale green-gray grounds; inspected tokens retain #172127 and #EBF0EB, with hue-tinted supporting text. Purple from the reference has not displaced the Coqui world. Pixel sampling was unavailable in the review environment. |
| THESIS / OWN-WORLD | match | The lesson and active question carry attention; the Coqui mark, forest palette, rounded outline icons, and Mac typography preserve the quiet learning-instrument identity. |
| STORY / FIRST VIEWPORT / FORM | match | Navigation → lesson → active input, with optional context at right, is immediately legible. The opening viewport reads as a learning workspace. The latest user-selected composition supplies the form; a new concept seed is not applicable to this established-world change. |
| Truth and states | match | The library is labeled “Offline fixture library”; the model picker honestly displays no matches and Connections honestly displays no connected accounts. The 21-check acceptance record is fixture evidence and is not evidence of live inference. Disabled submission is visually distinct in the question capture. |
| Craft floor | match | No generic eyebrow, hero-metric scaffold, gradient lettering, hard offset shadow, decorative side stripe, emoji icon system, or fake organic asset is visible. Functional dock and phase labels describe the learning state rather than decorative kickers. Settings provider groups are functional configuration, not a marketing card grid. |

## ceiling

The retained world's native devices are present: system typography, compact titlebar clearance, persistent destinations, one context inspector, a Coqui selection lens, and restrained glass. The detached model popover and miniature model label keep the contextual control below the finish of the rest of the shell. Static captures cannot certify fluidity; source and supplied acceptance evidence cover only the implemented motion policy, not a new frame-rate result.

## material_fixes

1. Fidelity / contextual control: position the model popover using its actual rendered height, with an approximately 8px gap above or below its trigger and viewport clamping; replace the fixed `rect.top - 360` estimate. Recapture the empty-catalog picker and verify a populated list can scroll without detaching from its trigger.
2. TYPE / readability: increase the composer model trigger from 10px to at least the direction's 12px supporting-control level, retain a forgiving activation region, and rebalance its width so the model, microphone, and primary action fit at 900px without overlap. Recapture Moonforest, Dew, the active question, and narrow chat after the change.

## keep

Keep the 52px rail / 236px sidebar composition, x376 reading alignment, bottom-anchored input, single inspector, Moonforest/Dew palette, original Coqui graphics, and restrained glass while fixing the contextual model control.
