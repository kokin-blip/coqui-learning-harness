---
name: "CoquiLearn"
description: "A quiet Mac learning instrument in Moonforest and Dew."
colors:
  dew-canvas: "#ebf0eb"
  dew-surface: "#fafcf7"
  dew-soft: "#e0e9e2"
  dew-ink: "#253c35"
  dew-muted: "#526d63"
  dew-accent: "#316a49"
  dew-accent-soft: "#cfe3d3"
  dew-on-accent: "#f5faf1"
  dew-line: "#b9cec0"
  dew-teal: "#327a72"
  dew-lilac: "#80709b"
  dew-rose: "#9b586b"
  dew-warning: "#855b29"
  dew-chrome: "rgba(212, 224, 218, 0.52)"
  dew-mist: "rgba(250, 252, 247, 0.72)"
  dew-lens: "rgba(234, 243, 237, 0.36)"
  dew-selected: "rgba(207, 227, 211, 0.78)"
  dew-edge: "rgba(255, 255, 255, 0.65)"
  dew-edge-strong: "rgba(255, 255, 255, 0.88)"
  dew-shadow: "rgba(6, 14, 17, 0.17)"
  dew-reading: "rgba(250, 252, 247, 0.97)"
  moonforest-canvas: "#172127"
  moonforest-surface: "#202d34"
  moonforest-soft: "#293940"
  moonforest-ink: "#ddede5"
  moonforest-muted: "#acc4bb"
  moonforest-accent: "#a9d9a0"
  moonforest-accent-soft: "#304b42"
  moonforest-on-accent: "#17291d"
  moonforest-line: "#4a655e"
  moonforest-teal: "#96d5c5"
  moonforest-lilac: "#c9bfe8"
  moonforest-rose: "#e5b4c4"
  moonforest-warning: "#edc99c"
  moonforest-chrome: "rgba(48, 66, 74, 0.52)"
  moonforest-mist: "rgba(32, 45, 52, 0.72)"
  moonforest-lens: "rgba(65, 86, 79, 0.36)"
  moonforest-selected: "rgba(48, 75, 66, 0.78)"
  moonforest-edge: "rgba(210, 235, 218, 0.13)"
  moonforest-edge-strong: "rgba(210, 235, 218, 0.24)"
  moonforest-shadow: "rgba(6, 14, 17, 0.24)"
  moonforest-reading: "rgba(32, 45, 52, 0.97)"
typography:
  page-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Inter\", sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: "34px"
    letterSpacing: "-0.4px"
  lesson-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Inter\", sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: "28px"
    letterSpacing: "-0.2px"
  question-title:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Inter\", sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "23px"
    letterSpacing: "-0.1px"
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "25px"
  control:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Inter\", sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: "20px"
  support:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Inter\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "17px"
  model-trigger:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Inter\", sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "18px"
rounded:
  session: "8px"
  answer: "9px"
  field: "10px"
  control: "12px"
  setting-card: "14px"
  dock: "16px"
  popover: "20px"
  pill: "999px"
spacing:
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "24": "24px"
  "32": "32px"
components:
  button-primary:
    backgroundColor: "{colors.dew-accent}"
    textColor: "{colors.dew-on-accent}"
    rounded: "{rounded.pill}"
    padding: "10px 24px"
  button-primary-compact:
    backgroundColor: "{colors.dew-accent}"
    textColor: "{colors.dew-on-accent}"
    rounded: "{rounded.pill}"
    padding: "7px 17px"
  button-secondary:
    backgroundColor: "{colors.dew-soft}"
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.pill}"
    padding: "10px 16px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.dew-muted}"
    padding: "3px 0"
  input:
    backgroundColor: "{colors.dew-soft}"
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.field}"
    padding: "10px 12px"
  destination:
    backgroundColor: "transparent"
    textColor: "{colors.dew-muted}"
    rounded: "{rounded.field}"
    padding: "8px"
    width: "36px"
    height: "36px"
  destination-selected:
    backgroundColor: "{colors.dew-selected}"
    textColor: "{colors.dew-accent}"
    rounded: "{rounded.field}"
    width: "36px"
    height: "36px"
  session-row:
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.session}"
    padding: "7px 10px"
    height: "34px"
  pill:
    backgroundColor: "{colors.dew-soft}"
    textColor: "{colors.dew-muted}"
    rounded: "{rounded.pill}"
    padding: "5px 16px"
  composer:
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.dock}"
    padding: "14px 16px 12px"
    width: "100%"
  inspector:
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.dock}"
    width: "300px"
  answer-option:
    backgroundColor: "{colors.dew-soft}"
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.answer}"
    padding: "8px 10px"
  model-picker:
    backgroundColor: "{colors.dew-mist}"
    textColor: "{colors.dew-ink}"
    rounded: "{rounded.popover}"
    padding: "16px"
---

# Design System: CoquiLearn

## Overview

**Creative North Star: "Moonforest / Dew"**

CoquiLearn is a quiet learning instrument with the material polish of a Mac app. Moonforest and Dew share forest-tinted neutrals, a leaf-green action color, the original vector coquí mark, rounded outline graphics, and the macOS system face. The lesson, current question, and learner’s reasoning carry attention; translucent chrome supports them.

The current composition follows the user’s compact desktop reference: a full-width title bar, slim destination rail, adjacent session sidebar, centered reading column with a bottom-anchored composer, and one right inspector. It replaces the earlier floating shell’s spacing while retaining the approved visual world. Glass is interpreted through CSS blur, highlights, and native window vibrancy; this record makes no claim of matching Figma’s refractive renderer.

**Key Characteristics:**

- Compact persistent navigation; open reading space.
- Stable text with localized glass on chrome and contextual surfaces.
- One active input and one context inspector.
- Interruptible selection continuity with reduced-motion and opaque-material alternatives.

This is a scan of the completed renderer, not a new visual proposal. Visual authority is [PRODUCT.md](PRODUCT.md) and the latest composition override in [UI direction](docs/design/ui-direction.md). The normative implementation is [styles.css](apps/desktop/renderer/styles.css), followed by the overriding [desktop-layout.css](apps/desktop/renderer/desktop-layout.css), [App.tsx](apps/desktop/renderer/App.tsx), and [ModelPicker.tsx](apps/desktop/renderer/components/ModelPicker.tsx). Where the earlier Figma geometry differs, the current renderer wins. The Figma file and Apple Music kit are provenance references recorded in UI direction, not imported runtime components.

Evidence is the corrected [review verdict](.impeccable/review/verdict.md), [layout metrics](.impeccable/review/layout-metrics.json), and seven captures: `desktop.png`, `desktop-dew.png`, `desktop-question.png`, `model-picker.png`, `connections.png`, `narrow.png`, and `narrow-sidebar.png` under `.impeccable/review/`. The desktop is 1512×893 CSS pixels at DPR 2; narrow is 900×720. The displayed lesson/library data is an offline fixture, and empty model/connection states are intentional. This visual record does not certify the full 233-check baseline or live-provider parity. The original private screenshot at `artifacts/design/references/compact-desktop-layout.png` is excluded from distribution.

## Colors

Forest-tinted surfaces give both themes a common character. Frontmatter keys preserve the renderer’s semantic names with a theme prefix: `dew-*` maps to light `:root`, `moonforest-*` to `:root[data-theme="dark"]`. Runtime components consume the unprefixed CSS variables. Frontmatter component color references show Dew; Moonforest substitutes the corresponding semantic role without changing component geometry.

### Primary

**Leaf green** (`accent`) marks primary actions, active destinations, focus, selected context, and links. **Leaf shade** (`accent-soft`) is the quiet selected backing; **on accent** is reserved for content on primary fill. Selected surfaces use the distinct translucent `selected` token.

### Secondary

**Pond teal** (`teal`), **orchid** (`lilac`), and **coquí blush** (`rose`) support authored topic graphics and semantic emphasis. Rose also appears on destructive text actions. **Warning** identifies recoverable attention. These colors are accents rather than replacements for reading ink.

### Neutral

**Forest ground** (`canvas`), **reading surface** (`surface`), and **soft group** (`soft`) establish tonal layers. **Ink** carries primary text; **muted** carries supporting text; **line** carries quiet dividers. **Chrome**, **mist**, and **lens** are translucent materials, not interchangeable opaque fills. **Edge** and **edge strong** are light-facing highlights; **shadow** is a depth tint. **Reading** is the near-opaque surface token retained for reading containers outside the current transparent lesson document.

Use the actual CSS values in the frontmatter. The Figma document also contains sky, peach, and warning-soft colors that are not current renderer tokens, so they are not minted here. Sidecar tonal ramps are synthesized preview metadata, not an implemented application scale.

## Typography

Use the macOS system face with the recorded fallback stack. The system face is explicitly approved for this native desktop product. Inter is a fallback and the editable Figma face, not a bundled SF Pro asset or a new display identity.

- **Page title:** use `page-title` for ordinary destination headings; Settings uses a smaller size (24px) within that heading structure.
- **Lesson title:** use `lesson-title` for the active session; short windows reduce its size (18px).
- **Question title:** use `question-title` inside the active question dock.
- **Reading:** use `body` at the default appearance setting. Prose is capped at 75ch; users may override font family and size. User transcript bubbles use smaller text (14px/23px).
- **Controls:** use `control`; primary action text is semibold. Compact session rows are 13px, while composer actions and the corrected model trigger use 12px. Inspector headings and supporting controls are 12px; secondary captions may be 11px, with tertiary footer metadata at 10px. Do not transfer footer density to reading or meaningful model selection.
- **Numeric detail:** confidence values use tabular figures. Code and structured output retain their own formatting and horizontal scrolling.

The base UI is 13.5px with a 1.5 line-height. The default reading size comes from `App.tsx`’s appearance fallback, overriding the earlier 17px CSS fallback. Do not document the fallback as the shipped default.

## Layout

The desktop shell fills the window with no outer gutter. Its title bar is 44px high and reserves 94px on the left for native traffic lights and shell controls. Below it, the grid is a 52px destination rail, a toggleable 236px session sidebar, and a flexible workspace. Shell dividers are faint and structural; chrome has square shared edges rather than separate floating cards.

The lesson workspace uses one flexible reading area and one 300px inspector, separated by 24px. Its outer inset is 16px at the top, right, and bottom. The lesson document is capped at 800px with 46px side padding; at the measured desktop size it starts at x330, with a 708px transcript/composer span beginning at x376. These measured positions are an acceptance example, not fixed coordinates for other windows. The transcript scrolls independently; the composer stays aligned at its bottom with a 16px window inset. The document itself has no card background, border radius, or shadow.

The composer has 14px top, 16px horizontal, and 12px bottom padding. Chat uses a concise input and footer. An active question grows upward into a scrollable dock (at most 56vh, or 53vh in short windows) so its inputs remain available without replacing the transcript. The inspector is one rounded container with compact sections, subtle separators, and disclosure for path/model detail.

Responsive rules follow the actual cascade:

- At 1260px and below, the lesson inspector becomes an absolute overlay; automatic visibility switches when crossing the 1260px runtime threshold. Reading padding becomes 40px.
- At 1100px and below, the shell uses a 48px rail and flexible workspace. The 236px sidebar becomes a toggleable overlay starting below the 44px title bar. Runtime closes it below 1100px; reading padding becomes 32px. Inspector width becomes 280px, and tertiary composer captions yield.
- At 900×720, both inspector and sidebar default closed; the sidebar can be opened without moving the composer. The measured narrow composer has no horizontal overflow. This is desktop-window adaptation, not a shipped phone layout.
- At a window height of 760px or less, the lesson title tightens, its caption hides, and the question dock’s maximum height reduces.

The recurring spacing scale is in the frontmatter. Local compact geometry uses additional measured values where its role requires them; do not force every control into the original Figma spacing grid. Start/setup content is centered at a 760px maximum with a bottom-positioned composer; Settings is capped at 1020px. Map selection becomes a single column at the narrow-window threshold.

## Elevation & Depth

Depth combines tonal layering, light-facing borders, local blur, and soft shadows. Persistent title bar, rail, and sidebar are flush shell regions. The current lesson is open canvas. The inspector has no outer shadow; the composer and contextual popovers carry the most visible lift. CSS blur and native vibrancy interpret the glass reference without claiming physical refraction.

**The Stable Reading Rule.** Keep long explanations and the active question stable; glass belongs to their supporting surfaces.

The actual material recipes are carried in the sidecar: general glass uses blur (24px), title-bar chrome (20px), session sidebar (24px), dock (20px), inspector (18px), and small lens (12px), with restrained saturation. Common glass uses an ambient 8px/24px shadow; the dock uses a softer 5px/18px shadow and inset edge. Shared shell surfaces suppress the general glass radius and shadow. Avoid promoting the older canopy’s floating-shell geometry back into the current layout.

The application connects OS/in-app appearance preferences to reduced transparency and reduced motion. Reduced transparency replaces glass with an opaque surface and removes blur/shadow; the app background also becomes opaque. Reduced motion suppresses CSS transitions and configures Motion accordingly. These alternatives preserve hierarchy and input access.

## Shapes

Use soft, purposeful corners: compact session rows and title-bar controls, fields and rail selections, standard controls, rounded dock/inspector, and pill primary actions each use the role-specific frontmatter radius. The answer option’s slightly tighter curve is intentional in the compact question dock. Settings/provider cards use their own intermediate curve. Popovers are softer than shell edges. The title bar, rail, and docked sidebar meet with square edges; only the narrow sidebar’s exposed right corners round.

Keep the original symmetric coquí vector mark and the incumbent rounded outline-icon grammar. Render authored SVGs as vectors; runtime icons come from the existing outline set. Radio choices use one centered native dot, and path states use equal circular containers with text/icon cues.

## Components

### Buttons

Primary actions are leaf-filled pills with on-accent text and semibold weight. The reusable base is 44px minimum height; the compact lesson/home action is 34px with the recorded compact padding. Secondary pills use soft group fill and ink; text actions use muted text and become accent on hover. Generic filled buttons use 180ms ease-out background/color changes and 240ms shadow changes; press feedback uses 100ms. Disabled controls are visibly subdued at 0.45 opacity. Preserve the 2px accent focus outline with a 4px offset.

### Inputs / Fields

Text fields use soft fill, a transparent 1px border, a field radius, and visible muted placeholders. The current chat composer uses an editable multiline input on a transparent surface, 14px/23px lesson input text, and its own scrolling maximum. Thinking is a distinct labeled area. The question renderer retains its schema-specific answer controls, uncertainty, confidence, Skip, and Submit instead of reducing every learning step to a chat field.

### Navigation

Rail destinations are centered 36px buttons within the 52px rail. The active destination carries an accent icon and selected lens, plus semantic current-state attributes. Recent sessions are compact single-line rows with truncation and a quiet lens fill when current. The rail retains Settings at its bottom; the sidebar retains New session, recent sessions, local-data/fixture status, and its footer Settings control.

Selection continuity uses a shared, interruptible Motion layout lens with a spring (stiffness 180, damping 28, mass 1). The shell/sidebar slide uses the recorded 320ms settling curve. This source policy is documented; the still captures do not certify frame rate.

### Chips / Tags

Status pills are subdued soft-fill labels with muted text and pill corners. The active question uses a smaller 11px variant. File chips are compact removable items with a tighter curve; their text identifies actual attached content. Color is always accompanied by text or an icon state.

### Composer and inspector

The anchored composer is the active work surface. Its glass background mixes soft group with mist; its model control is contextual and retains the corrected readable 12px size. The inspector collects path, background work, sources, extraction, and model/usage within one surface. Sections use compact padding, muted headings, and progressive disclosure rather than separate floating cards.

### Model picker

The picker is a measured fixed-position popover, at most 400px wide with 16px viewport clearance, at most the smaller of 360px or viewport height minus 32px tall. Search, an explicit default-model action, a scrollable list, and an honest empty state share the surface. It repositions when trigger/popover sizes, viewport size, or scrolling change. Opening uses a short spring (stiffness 240, damping 30), 4px travel, and 0.99→1 scale. Keyboard search/selection and Escape return focus to the trigger.

**The Context Attachment Rule.** Keep the model picker attached to its trigger with a measured 8px gap when space permits, and clamp the surface to the viewport.

### Cards / Containers and truth states

Provider connections and library items use quiet rounded grouped rows with no outer shadow. In unconfigured states, display missing accounts/models directly. The sparse transcript and empty catalog in review screenshots are fixtures and environmental state, not fixed product copy or a desired content quota.

**The Evidence Rule.** Label illustrative sessions and offline fixtures honestly; a screenshot is visual evidence, not proof of live inference or feature parity.

## Do's and Don'ts

### Do:

- Do preserve the Moonforest/Dew semantic color roles and original coquí vector assets.
- Do use the macOS system font stack and retain separate reading and compact-control hierarchies.
- Do keep the transcript and anchored composer aligned within the same reading column.
- Do consolidate lesson context in one inspector and yield it before reducing reading space.
- Do preserve visible focus, text/icon state cues, reduced motion, and opaque glass fallbacks.
- Do identify demonstration content as fixtures and record provider verification separately.

### Don't:

- Don’t restore the earlier floating shell’s outer gutters or multiple competing lesson panels.
- Don’t tint every paragraph as a card or put moving refraction behind active reading text.
- Don’t reduce the composer model trigger below its corrected 12px size.
- Don’t position contextual popovers using an assumed fixed height.
- Don’t replace authored vector graphics with emoji or mix unrelated icon grammars.
- Don’t copy private reference-screenshot content into the app or include that screenshot in distribution.
- Don’t treat planned Figma screens, synthetic color ramps, or fixture checks as shipped runtime capability.
