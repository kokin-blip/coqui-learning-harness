## verdict

1. **Resolved — popover attachment.** The recaptured `model-picker.png` shows the empty-catalog surface immediately above its composer trigger. The measured gap is 8 CSS px with viewport clamping. The inspected placement code measures the rendered height and updates on popover/trigger resize, viewport resize, and scroll, replacing the fixed 360px estimate.
2. **Resolved — model-control readability.** The model label is visibly larger in the recaptured Moonforest, Dew, active-question, and narrow layouts. The computed size is 12px. At 900 CSS px it fits beside the microphone and primary action without overlap or horizontal overflow; the measured model bounds are x495.625–677 within the footer ending at x825.

## remaining

Clear. All seven same-named recaptures remain valid; no regression introduced by this fix batch is visible. This ship disposition covers the scored fixes only.

disposition: ship
