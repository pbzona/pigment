---
target: studio
total_score: 30
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
timestamp: 2026-08-13T16-02-11Z
slug: apps-web-app-studio-page-tsx
---
⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed; assessments were completed sequentially and kept detector evidence out of the design review until Assessment A finished)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Upload, processing, crop, export, palette changes, and errors are surfaced; active editing mode is clear, but the relationship between source changes and automatic reprocessing is not always explicit. |
| 2 | Match System / Real World | 3 | “Convert,” “Select,” and “Paint” are natural artistic verbs; “quantization,” “dominant vote,” “isolate,” and “re-match” still require learning. |
| 3 | User Control and Freedom | 4 | Undo/redo, cancelable crop, replace image, deselection, clear isolation, reset controls, and reversible editor modes provide unusually strong escape routes. |
| 4 | Consistency and Standards | 3 | Shared controls are coherent, but the canvas toolbar’s soft shadow/backdrop treatment and the mobile rounded sheet edge drift from Pigment’s hard, square mechanical language. |
| 5 | Error Prevention | 3 | File limits, disabled impossible actions, destructive confirmations, constrained dimensions, and at-least-one-color guards are strong; some dense icon controls still invite accidental mobile taps. |
| 6 | Recognition Rather Than Recall | 2 | Tooltips and accessible names help, but the loaded editor presents many icon-only controls and hidden sheets, and shortcuts are taught only inside specific panels. |
| 7 | Flexibility and Efficiency | 3 | Keyboard paint navigation, P/F/I/E tool shortcuts, undo/redo, direct numeric entry, grid scaling, and visible expert controls are strong; shortcut discovery is fragmented. |
| 8 | Aesthetic and Minimalist Design | 3 | The artwork owns the center and chrome is disciplined, but the abrupt jump from one upload decision to three simultaneous control zones creates a high initial noise floor. |
| 9 | Error Recovery | 3 | Errors use direct language, toasts, inline alerts, and preserve the broader editor state; transient toast-only failures may be easy to miss. |
| 10 | Help and Documentation | 3 | The learning lab, inline descriptions, tooltips, privacy reassurance, and concise microcopy are useful; contextual orientation after first upload is missing. |
| **Total** | | **30/40** | **Good** |

## Design Specificity Verdict

**LLM assessment:** The Studio feels authored for Pigment, not category-interchangeable. The central artwork, square mechanical controls, palette-first output panel, visible quantization choices, terse mono measurements, and privacy-forward upload state form a credible “Chromatic Lab Notebook.” The strongest product-specific choice is that algorithmic conversion, regional method changes, palette editing, and cell painting coexist around one live artifact. The weak point is not generic styling; it is that the loaded editor behaves like an expert workstation before it teaches the playful experiment.

**Deterministic scan:** The CLI scan found one advisory in `packages/ui/src/styles.css:74`: `codex-grid-background` for the tiled two-axis grid background. This is a contextual false positive for the Studio because Pigment is explicitly a pixel/measurement surface and the grid is a documented incumbent brand device. Browser injection succeeded in a fresh `[Human] Studio — Pigment` tab and reported one separate `layout-transition` warning for `transition: height`; no critical detector findings appeared. The browser finding is low priority but valid: prefer transform/opacity or instant layout changes where possible.

**Visual overlays:** The detector script was successfully injected into the fresh `[Human] Studio — Pigment` browser tab. Its console reported the single `layout-transition` finding. The CLI grid advisory did not appear as a browser-page finding.

## Overall Impression

The Studio already has a sharp identity and an unusually capable interaction model. The empty state is calm, legible, and trustworthy; the loaded state is powerful and visually disciplined. The biggest opportunity is to preserve that power while staging the first minute of use as playful discovery rather than exposing an expert cockpit all at once.

## What's Working

1. **The artifact genuinely leads.** Both desktop and mobile give the image the largest, darkest uninterrupted region. Sidebars are structural rather than card clutter, and palette colors—not UI pigments—remain the richest chromatic object.
2. **Control and recovery are excellent.** Undo/redo, cancelable crop, replace image, reversible selection modes, visible disabled states, palette safeguards, and local-processing copy reduce the fear of experimentation.
3. **Accessibility foundations are stronger than the visuals imply.** The editor exposes meaningful accessible names, real tabs, sliders, switches, dialogs, keyboard cell navigation, focus styling, reduced-motion handling, live status regions, and text alternatives for icon controls.

## Priority Issues

### [P1] The loaded editor introduces too many simultaneous decisions

**Why it matters:** Immediately after upload, a first-time artist sees Convert/Select/Paint, five source sliders, transparency controls, a method selector, seven canvas tools, cell-grid controls, a 16-color palette, palette management, adjustments, and export. The cognitive-load review fails **one thing at a time**, **minimal choices**, and **progressive disclosure**. This is moderate overall load, but it lands at the exact moment the user should feel delight at their first result.

**Fix:** Give the first result a lightweight guided state: visibly emphasize one next experiment (“Try another method”), collapse advanced source controls behind a disclosed section, and delay selection/paint explanation until the user chooses those modes. Keep everything skippable and never block the canvas.

**Suggested command:** `/impeccable onboard`

### [P1] Mobile toolbar targets are undersized and densely packed

**Why it matters:** Browser measurement found twelve visible controls below the 44×44 CSS-pixel touch target: Undo, Redo, Open controls, Open output, Zoom out/in, Compare, Fit, Crop, Grid, and Guidelines are 32×32; Export is 52×40. On a one-handed phone, the top bar and floating canvas toolbar create adjacent mis-tap risk around actions that change mode or artwork state.

**Fix:** Preserve the compact icons visually but enlarge their invisible hit areas to at least 44×44, increase separation around destructive/state-changing clusters, and let lower-frequency canvas controls move into one clearly labeled overflow or bottom action sheet on narrow screens.

**Suggested command:** `/impeccable adapt`

### [P2] Shortcut and tool discoverability is fragmented

**Why it matters:** Power features exist—P/F/I/E, Cmd/Ctrl-Z, keyboard canvas movement, Space/right-drag panning—but they are revealed in different panels or only via hover tooltips. A new user cannot form a mental model, while an expert has to hunt for accelerators.

**Fix:** Add one compact, dismissible shortcuts/help surface reachable from the header; show shortcut hints consistently in tooltips; use platform-aware Cmd/Ctrl notation; include canvas keyboard operation and panning in the same reference.

**Suggested command:** `/impeccable clarify`

### [P2] The mobile and canvas chrome partially drift from the documented physical language

**Why it matters:** The canvas toolbar uses `shadow-lg`, translucent backdrop blur, and soft black shadow; the mobile controls sheet uses a rounded top edge. Those choices read as generic app chrome beside Pigment’s otherwise square frames and hard offset shadows, weakening specificity at the product’s most important surface.

**Fix:** Restyle floating canvas controls as a square, hard-shadowed instrument rail and make mobile sheets use the same framed mechanical vocabulary. Keep opacity only where it protects artwork visibility; remove ambient blur and soft elevation.

**Suggested command:** `/impeccable polish`

### [P2] Upload copy understates supported input

**Why it matters:** The file input accepts GIF, and PRODUCT.md records GIF support, but the empty-state copy says only “PNG, JPEG, or WebP.” Users with GIF assets may assume the product cannot open them.

**Fix:** Change the helper copy to “Drop a PNG, JPEG, WebP, or GIF…” and keep equivalent copy consistent in the learning lab and any error messages.

**Suggested command:** `/impeccable clarify`

## Persona Red Flags

**Jordan (Confused First-Timer):** Uploading is obvious within five seconds, but the successful result opens directly into an expert layout with three modes and many unlabeled-at-rest icons. “Dominant vote,” “quantization,” “isolate,” and “re-match” are explained only locally. Jordan can produce a result but may not know which action is the playful next step.

**Sam (Accessibility-Dependent User):** Semantic controls, focus styles, accessible icon names, keyboard canvas operation, and live feedback are strong. The principal failure is motor accessibility on mobile: twelve visible controls measure 32×32 or 40px high. Toast-only errors may also disappear before a screen-magnifier user relocates attention.

**Alex (Impatient Power User):** Alex gets real accelerators, undo/redo, numeric input, panning, direct method selection, and no forced tutorial. The red flag is discoverability: shortcuts are distributed across panel copy and hover-only tooltips, with no single command reference or visible keyboard-help entry.

## Minor Observations

- The empty state is visually excellent but uses a one-pixel dashed frame and softer icon shadow than the shared two-pixel mechanical system; this is acceptable quiet hierarchy, not a defect.
- Mobile filename truncation works, but the header offers little room for state beyond filename and cell count; processing/export state must remain announced without adding more visible chrome.
- The 64×6 test image exposes a lot of empty canvas, but fit controls and centered artwork make that behavior understandable.
- The detector’s grid-background advisory should be ignored for this product surface; the grid is semantically tied to pixels and measurement.
- Replace `transition: height` where the injected detector flagged it; layout animation is unnecessary if the same communication can happen with transform/opacity.

## Questions to Consider

- What is the one delightful experiment Pigment should invite immediately after the first conversion: changing method, changing palette, or painting one cell?
- Could “Convert → Select → Paint” become an optional learning path without turning into forced onboarding?
- Which three canvas actions truly deserve permanent mobile toolbar space?
- Should Pigment expose a single `?` / shortcuts panel as the bridge between beginner play and expert efficiency?
