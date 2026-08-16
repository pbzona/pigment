---
name: Pigment
description: A playful chromatic lab notebook for hands-on art and algorithm experiments.
colors:
  kiln-orange: "#f06a32"
  kiln-ink: "#17100c"
  electric-ultramarine: "#4d7cff"
  signal-green: "#3ebd78"
  token-yellow: "#f2cf45"
  danger-red: "#ee4540"
  carbon-canvas: "#11100f"
  carbon-panel: "#181715"
  carbon-popover: "#1d1b18"
  carbon-control: "#292622"
  carbon-muted: "#25221f"
  warm-pixel-paper: "#f5f2e8"
  quiet-notation: "#aaa49a"
  control-stroke: "#5e5a53"
  hard-shadow: "#050505"
typography:
  display:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3rem, 6vw, 6.5rem)"
    fontWeight: 680
    lineHeight: 0.9
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 4rem)"
    fontWeight: 670
    lineHeight: 1
    letterSpacing: "-0.04em"
  title:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 720
    lineHeight: 1.2
    letterSpacing: "-0.035em"
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  square: "0px"
spacing:
  hairline: "1px"
  control: "8px"
  compact: "12px"
  standard: "16px"
  panel: "20px"
  section: "48px"
components:
  button-primary:
    backgroundColor: "{colors.kiln-orange}"
    textColor: "{colors.kiln-ink}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  button-secondary:
    backgroundColor: "{colors.carbon-control}"
    textColor: "{colors.warm-pixel-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  button-outline:
    backgroundColor: "{colors.carbon-canvas}"
    textColor: "{colors.warm-pixel-paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "0 16px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.carbon-canvas}"
    textColor: "{colors.warm-pixel-paper}"
    typography: "{typography.body}"
    rounded: "{rounded.square}"
    padding: "8px 12px"
    height: "40px"
  card-default:
    backgroundColor: "{colors.carbon-panel}"
    textColor: "{colors.warm-pixel-paper}"
    rounded: "{rounded.square}"
    padding: "20px"
---

# Design System: Pigment

## Overview

**Creative North Star: "The Chromatic Lab Notebook"**

Pigment is a dark, gridded notebook where visual experiments, algorithm notes, and handmade interventions occupy the same page. It is playful, technical, tactile, and candid: color is vivid, the machinery is visible, and controls look ready to be pushed rather than admired from a distance.

The interface combines the directness of graph paper and technical annotation with the cheerful physicality of an art toy. Square surfaces, exposed dividers, hard shadows, pixel imagery, terse mono labels, and immediate state changes make the system feel assembled and inspectable. It should never become sterile software chrome or nostalgic game decoration; the point is curious artistic play with enough rigor to teach what happened.

**Key Characteristics:**
- A near-black grid provides a continuous working ground.
- Warm off-white strokes define structure with unusually high clarity.
- Kiln Orange carries primary action; ultramarine, green, and yellow annotate distinct states.
- Square geometry and hard offset shadows make controls feel physical.
- Geist Sans explains; Geist Mono labels, measures, indexes, and reports.
- Reduced images, cell grids, and palette strips are working material, not decorative garnish.

## Colors

The palette sets warm paper-like ink against carbon surfaces, then uses four saturated pigments as scarce, legible signals.

### Primary
- **Kiln Orange:** The main action color for primary buttons, selected controls, process emphasis, and the pig mascot. Pair it with Kiln Ink when it carries text.

### Secondary
- **Electric Ultramarine:** Focus rings, links, distance indicators, and cool technical emphasis. It is the clearest keyboard-focus signal.
- **Signal Green:** Positive or distinct palette accents, especially in the four-color brand mark.

### Tertiary
- **Token Yellow:** Favorites, warm highlights, and the brand mark. Use it for specific meaning rather than generic decoration.
- **Danger Red:** Destructive actions and invalid states only.

### Neutral
- **Carbon Canvas:** The global page and editor ground.
- **Carbon Panel:** Default cards, panels, and contained working surfaces.
- **Carbon Popover:** Menus, dialogs, and elevated transient surfaces.
- **Carbon Control:** Secondary buttons and stronger control wells.
- **Carbon Muted:** Quiet hover and inactive surfaces.
- **Warm Pixel Paper:** Primary text, strong borders, and high-emphasis icon strokes.
- **Quiet Notation:** Supporting copy, metadata, and inactive labels.
- **Control Stroke:** Low-emphasis input boundaries.
- **Hard Shadow:** Opaque offset depth beneath physical controls and panels.

### Named Rules

**The Pigment Has a Job Rule.** Every saturated color communicates action, focus, status, category, or artwork content; none exists merely to fill empty space.

**The Warm Ink Rule.** Use Warm Pixel Paper—not pure white—for ordinary text and structural strokes. Reserve white for exceptional contrast inside saturated states.

**The Artwork Leads Rule.** User images and palette swatches may introduce any color. Interface pigments must not compete with them for visual dominance.

## Typography

**Display Font:** Geist (with system sans-serif fallback)  
**Body Font:** Geist (with system sans-serif fallback)  
**Label/Mono Font:** Geist Mono (with system monospace fallback)

**Character:** The sans family is plainspoken and compact enough for a working tool, while the mono family makes methods, measurements, controls, and indexes feel observable. Large type becomes expressive through tight tracking and scale rather than through a decorative display face.

### Hierarchy
- **Display** (weight 680, fluid 3rem–6.5rem, line-height 0.9): Rare, oversized titles on palette details and major expressive moments; tracking never tighter than -0.04em.
- **Headline** (weight 670, fluid 2rem–4rem, line-height 1): Section and empty-state headings with tightly fitted rhythm; tracking never tighter than -0.04em.
- **Title** (weight 720, 1.25rem, line-height 1.2): Product lockups, panel titles, and prominent card names.
- **Body** (weight 400, 1rem, line-height 1.6): Explanations and instructional prose, generally held below roughly 65 characters per line.
- **Label** (weight 650, 0.72rem, letter-spacing 0.08em, uppercase): Field labels, indexes, statistics, dimensions, status, and compact controls.

### Named Rules

**The Explain and Measure Rule.** Sans text explains the experiment; mono text identifies, measures, indexes, or controls it.

**The Tight-at-Scale Rule.** Large headings use tight tracking and compact leading. Body copy never inherits that compression.

**The Honest Label Rule.** Uppercase mono labels stay short and factual. Do not turn descriptive sentences into technical-looking microcopy.

## Layout

Pigment uses a responsive workbench model. Marketing and catalog pages sit in centered containers up to roughly 80–92rem wide with 1.25rem desktop gutters and 0.75rem mobile gutters. Major sections use visible rules, indexed columns, and grids rather than floating islands. The catalog favors a three-column card grid, reducing to two below 73.75rem and one below 47.5rem.

The studio prioritizes the artifact: a flexible canvas occupies the center, with a 18rem inspector on the left and a 20rem output panel on the right when space allows. Narrow screens move those controls into bottom and side sheets while keeping creation available. Dense control regions use 0.5–1.25rem spacing; page sections use approximately 3–7rem of vertical separation.

Grid lines are part of the environment, not a content layout constraint. Align component edges deliberately to the visible structure, but do not force every element onto the 24px background grid. Responsive changes should preserve task order, touch targets, keyboard access, and the central artwork before preserving desktop symmetry.

## Elevation & Depth

Pigment uses a playfully mechanical depth model. Surfaces are flat until they need to read as a movable panel, pressable control, or transient layer; then depth appears as a crisp, zero-blur offset shadow. Buttons move away from their shadows on hover and collapse toward the surface when pressed. Dialog overlays use dark opacity rather than blur-heavy glass.

### Shadow Vocabulary
- **Panel block** (`6px 6px 0 #050505`): Major cards, filters, dialogs, popovers, and sheets.
- **Control block** (`3px 3px 0 #050505`): Primary and secondary controls at rest.
- **Chromatic control block** (`3px 3px 0 #f06a32`): Outline controls and selected structural emphasis.
- **Raised hover** (`5px 5px 0 #050505`): A pressable control moving up and left on hover.
- **Catalog lift** (`8px 8px 0 #f06a32`): Palette cards under direct pointer exploration.

### Named Rules

**The Mechanical Shadow Rule.** Shadows are hard, directional, and attached to an interaction or structural layer. Never use diffuse ambient drop shadows.

**The Press Has Consequence Rule.** A physical-looking control must visibly move or lose depth when activated; shadow alone is not enough.

## Shapes

The form language is unapologetically square. Cards, buttons, inputs, dialogs, tabs, and panels use zero-radius corners, two-pixel structural borders, and one-pixel internal dividers. Pixel grids, swatches, and the four-cell brand mark reinforce this geometry. Rounded shapes belong only to intrinsically round marks, such as color wells or indicator dots, or to a platform affordance that would become less usable if squared.

Borders are active structure. Warm Pixel Paper defines strong component silhouettes; Control Stroke handles quieter field boundaries. Avoid nesting multiple heavy borders without a hierarchy: use one strong exterior frame and lighter internal dividers.

**The Square Until Proven Otherwise Rule.** New components begin at zero radius. A rounded exception must communicate a specific affordance rather than generic friendliness.

## Components

### Buttons

Buttons feel like compact arcade inputs: labeled plainly, framed heavily, and responsive to pressure.

- **Shape:** Square, with a two-pixel Warm Pixel Paper border and no radius.
- **Primary:** Kiln Orange with Kiln Ink, uppercase mono text, 2.5rem default height, and a hard 3px shadow.
- **Hover / Focus:** Hover shifts up-left and grows the shadow; active shifts down-right and removes it. Keyboard focus uses a visible Electric Ultramarine ring outside the silhouette.
- **Secondary:** Carbon Control with warm text; hover may switch to Electric Ultramarine when the change remains semantically clear.
- **Outline:** Carbon Canvas with a Kiln Orange offset shadow; hover fills with Carbon Muted.
- **Ghost:** Transparent border at rest; reveals its border and muted fill on hover.
- **Destructive:** Danger Red is reserved for irreversible or destructive actions.

### Tabs and Toggles

Tabs form one segmented machine control, not a row of pills. A shared two-pixel frame contains square triggers separated by two-pixel dividers. Active tabs and toggles use Kiln Orange with Kiln Ink; inactive options use muted carbon surfaces. Focus remains visible inside the group without changing its dimensions.

### Cards / Containers

- **Corner Style:** Square.
- **Background:** Carbon Panel for persistent cards; Carbon Popover for transient layers.
- **Shadow Strategy:** Major panels receive the 6px block shadow; ordinary content divisions may remain flat.
- **Border:** Two-pixel exterior structure with two-pixel section dividers; data-dense catalog cards may use one-pixel rules.
- **Internal Padding:** 1.25rem is the component default; denser tool panels may use 0.75–1rem.

### Inputs / Fields

- **Style:** Carbon Canvas fill, square corners, two-pixel Control Stroke boundary, 2.5rem default height, and 0.75rem horizontal padding.
- **Focus:** Boundary changes to Electric Ultramarine and the global visible focus outline remains available.
- **Error / Disabled:** Invalid fields use Danger Red. Disabled controls retain their shape, reduce to 50% opacity, and use a not-allowed cursor where relevant.
- **Labels:** Short uppercase mono labels sit above controls; guidance and validation use readable sentence-case body text.

### Navigation

Navigation is compact and structural. The brand mark and Pigment name anchor the left edge; primary destinations use ghost buttons, while the current or highest-value action may use a filled control. Sticky navigation uses an opaque or near-opaque carbon surface with a simple lower rule. Mobile treatments reduce labels selectively but preserve accessible names.

### Palette Cards

Palette cards are the signature bridge between archive and artwork. A full-width swatch strip is the visual lead, while filename, dimensions, tags, and favorite state remain visibly structured around it. Hover lifts the whole card up-left and changes the hard shadow to Kiln Orange. Metadata stays mono and compact; palette names remain sans and legible.

### Brand Mark and Mascot

The brand mark is a square 2×2 checker that matches the favicon: Carbon Canvas and Kiln Orange alternate inside a Warm Pixel Paper frame. It uses a heavy frame and Kiln Orange offset shadow and must remain crisp at small sizes. The four-color palette remains available for interface semantics, but it is not part of the primary logo. The pig mascot is a purposeful moment of humor; use it at welcome, catalog, learning, or empty-state moments rather than repeating it as wallpaper.

## Do's and Don'ts

### Do:
- **Do** keep the artwork or palette as the most chromatically complex object on a working screen.
- **Do** expose structure with square frames, clear dividers, and factual mono annotation.
- **Do** make interactive state changes immediate and physical: lift on hover, compress on press, and show focus unmistakably.
- **Do** preserve a clear hierarchy between a two-pixel outer frame and lighter internal rules.
- **Do** use the mascot and playful copy as concise rewards around real interaction.
- **Do** honor reduced-motion preferences while preserving non-motion state cues.

### Don't:
- **Don't** add rounded cards, pill buttons, frosted glass, soft gradients, or diffuse SaaS shadows.
- **Don't** use saturated interface color without a semantic job.
- **Don't** imitate retro games with ornamental scanlines, fake CRT effects, or novelty pixel fonts; Pigment is a contemporary art tool.
- **Don't** turn every label into uppercase mono text; explanations need the warmth and readability of sentence-case sans.
- **Don't** hide algorithm choices behind magical language or decorative abstraction.
- **Don't** let expressive chrome crowd the canvas, palette, or image being explored.
