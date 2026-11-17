# Canvas framing

## Approved outcome

Artists can place a source image inside a square or rectangular canvas, adding negative space when the source is too short on either side. The same composition drives reference, adjusted, and pixelated views and their PNG exports. Source images remain local and intact.

## Interaction

- Open **Canvas framing** from the Studio toolbar or Reference inspector.
- Choose square, portrait, landscape, or custom transfer-grid proportions (2–32 columns and rows).
- Fit the whole image, center it, uniformly scale it, and move it within the canvas using dragging or keyboard-accessible controls.
- Fill uncovered space with a selected existing palette swatch. Background pixels bypass source adjustments and nearest-color matching. Background cells remain paintable.
- Preview changes locally; Apply commits and Cancel leaves the project untouched.
- Geometry changes rebuild the artwork and require confirmation before clearing painted edits, selections, regional methods, or history. Background-only changes preserve edits.
- Return to original image bounds explicitly. Source cropping remains available when framing is off; framing never silently translates a canvas crop into a source crop.

## Shared model and pipeline

`CanvasFrame` stores transfer columns/rows, uniform fit scale, centered offsets in fractions of canvas size, and a stable background palette color ID. Canvas dimensions are independent of source bounds. A shared layout and sampler implement preview, conversion, and reference export; only source samples receive input adjustments. Whole background cells retain the chosen palette ID for every method, including dithering and non-square partitions. Output raster dimensions maintain the canvas ratio and grid-size limits.

Raw source previews and palette extraction continue using the source rather than the padded canvas. Paint overrides are composited after conversion, so manual changes on background cells survive background-swatch changes. Palette replacement maps the background swatch with the existing palette-remapping behavior; deleted/stale IDs fall back safely.

Saved projects carry an optional frame; older projects retain their current bounds. Invalid saved framing is ignored. Reference exports use framed dimensions and the full-canvas transfer grid. Browser allocation/export limits apply to enlarged canvases.

## Verification

Focused tests cover geometry, fitting, clipping, limits, validation, exact fill colors, source-only adjustments, paint composition, ratio-preserving resolution, old-project restoration, saved framing, and reference rendering. Verify Studio controls, Apply/Cancel, edit-loss confirmation, palette changes, PNG output, reload, and desktop/mobile layout in a local browser.
