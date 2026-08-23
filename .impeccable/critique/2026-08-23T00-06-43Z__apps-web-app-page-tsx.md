---
target: apps/web/app/page.tsx
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 3
timestamp: 2026-08-23T00-06-43Z
slug: apps-web-app-page-tsx
---
# Pigment design critique

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Studio reports processing and restoration, but compatibility changes rely heavily on transient toast feedback. |
| 2 | Match System / Real World | 3 | Most language is direct; the homepage still describes an obsolete procedure model. |
| 3 | User Control and Freedom | 3 | Undo, replace, reset, and navigation are strong; polygon partition restrictions remove Regions with little explanation. |
| 4 | Consistency and Standards | 2 | Homepage demonstration, mobile navigation, and current Studio architecture disagree about the product structure. |
| 5 | Error Prevention | 3 | Inputs are constrained and incompatible methods are filtered; several constraints remain implicit. |
| 6 | Recognition Rather Than Recall | 3 | Main destinations and controls are labeled; hidden Lab navigation on mobile and disabled Regions reduce discoverability. |
| 7 | Flexibility and Efficiency | 3 | Keyboard support, local restoration, direct manipulation, and presets are useful accelerators. |
| 8 | Aesthetic and Minimalist Design | 2 | Strong visual language, but tiny annotations and a dense Studio compete with the artwork. |
| 9 | Error Recovery | 3 | Work is preserved and errors are generally actionable; compatibility fallback lacks durable context. |
| 10 | Help and Documentation | 3 | Lab is substantial and contextual hints exist, though links and explanations do not always follow the user into constrained states. |
| **Total** | | **28/40** | **Good foundation, important coherence and hierarchy issues** |

## Design Specificity Verdict

Pigment feels authored for this product. The square construction, hard shadows, grid field, orange action color, visible sampling language, and palette-forward surfaces form a recognizable world. The working screens feel like an artist-engineer's instrument rather than generic SaaS.

The homepage is now the least product-specific surface. Its large mock procedure is a frozen diagram of an architecture the product has abandoned. It advertises square partitioning, geometric median, texture, and interventions as a linear procedure even though Studio now uses task-based Image, Regions, Partition, and Palette controls. The artifact is visually specific but factually stale.

The deterministic CLI scan returned no findings. Browser visualization reported 13 anti-patterns: eleven undersized functional text findings around 9px, one all-caps body finding, and text-occlusion reports around the decorative top-left corner. The occlusion reports appear to be overlay false positives because the screenshot shows the text unobstructed. The 9px findings are real and visible in the procedure diagram, footer, and metadata. Font-overuse reports for Geist and Geist Mono are not actionable because those are the committed product typefaces.

Live overlays were injected successfully in the critique browser tab during review. The local browser and overlay server were stopped afterward.

## Overall Impression

The product has a clear visual identity and a much stronger Studio/Lab concept than it started with. The main opportunity is coherence: the homepage, mobile header, and Studio constraints should describe the app that exists now. The canvas should remain the loudest object; several interface layers currently compete with it through dense borders, labels, and metadata.

## What's Working

1. **The visual language belongs to Pigment.** The carbon field, warm ink, orange action state, square controls, and palette strips are coherent across Home, Studio, Lab, and Palettes.
2. **The app respects the artwork.** Studio gives most of the viewport to the image, keeps processing local, and restores the project without requiring an account.
3. **Studio and Lab form a useful conceptual pair.** Studio supports making while Lab supports understanding. The split is easy to explain and gives the educational material a real job.

## Priority Issues

### [P1] The homepage demonstrates an obsolete product model

**Why it matters:** The largest object on the homepage is a linear procedure panel with Square partition, Geometric median, Map to palette, Texture, Interventions, and Output. Studio no longer uses that model, and the new Hex/Voronoi capability is absent. A first-time visitor learns the wrong mental model before opening the app.

**Fix:** Replace the procedure mockup with a live-feeling partition comparison using one source image rendered as Square, Hex, and Voronoi. Keep Studio and Lab as the two actions. Remove procedural copy such as "Build an image procedure" and the footer's "one shared project" language.

**Suggested command:** `/impeccable shape`

### [P1] Mobile navigation hides Lab

**Why it matters:** At 390px the header shows Studio and Palettes, while Lab disappears. Studio and Lab are the primary pair and should remain adjacent at every width. This breaks the information architecture on the device where navigation needs to be clearest.

**Fix:** Keep Studio and Lab visible. Move Palettes behind a compact menu or reduce the brand lockup before hiding a primary destination.

**Suggested command:** `/impeccable adapt`

### [P1] Polygon restrictions are discoverable only after they remove functionality

**Why it matters:** Selecting Hex or Voronoi disables Regions and filters several methods. The method explanation mentions the square restriction, but the disabled Regions tab has no reason attached. Users may interpret the state as broken.

**Fix:** Add a short persistent compatibility note beside Partition Shape and attach a tooltip or inline explanation to disabled Regions. State what remains available, not only what was removed. Preserve the user's previous square-only method so returning to Square restores it.

**Suggested command:** `/impeccable clarify`

### [P2] Functional annotation is too small

**Why it matters:** The browser detector found eleven functional labels at 9px. These include procedure indexes, metadata, and status text. At normal desktop distance they read as texture instead of information; at mobile scale they become inaccessible.

**Fix:** Set an 11px floor for functional mono text and reserve 9px only for decorative marks with no task value. Increase line-height and reduce tracking where labels are dense.

**Suggested command:** `/impeccable typeset`

### [P2] Studio control density competes with the canvas

**Why it matters:** On desktop, two persistent sidebars, a dense top toolbar, heavy dividers, palette editing controls, and helper copy surround the artwork. The canvas remains large, but the chrome has nearly equal visual weight.

**Fix:** Collapse low-frequency palette editing behind Manage, reduce explanatory copy after first use, and use lighter internal rules. Keep Partition, Scale, Sampling Method, and Palette immediately visible; progressively disclose the rest.

**Suggested command:** `/impeccable distill`

## Persona Red Flags

**Jordan, first-time visual artist:** Opens the mobile homepage and cannot see Lab in the header. The homepage procedure mock suggests a fixed technical workflow. In Studio, choosing Voronoi disables Regions without an explanation attached to the disabled control. Jordan is likely to assume the feature is unfinished rather than intentionally constrained.

**Maya, practicing illustrator:** The sample chooser and local privacy message are strong. Once inside Studio, palette management, output resolution, partition shape, adjustments, guides, comparison, crop, and region controls compete for attention. Maya wants to make a quick visual variation and may not know which four controls matter first.

**Alex, technical power user:** Project restoration, keyboard shortcuts, deterministic Voronoi, and Lab inspection are strong. Alex will notice that the homepage model no longer maps to Studio and that changing to a polygon partition silently changes the active method via toast. Restoring the previous square-only method would make experimentation more trustworthy.

## Minor Observations

- The default metadata title still says "A visual color workshop for artists," which has more product-positioning language than the direct in-app copy.
- The homepage illustration says "Live" despite being static.
- The footer repeats the Studio/Lab relationship already established by the two main actions.
- The decorative corner line near the homepage mock creates detector occlusion false positives and adds little at mobile sizes.
- The square-only grid button correctly disables for polygon partitions, but its disabled state has no tooltip.

## Questions to Consider

- Should the homepage be a compact launcher with a real partition demonstration, or should `/` open Studio directly?
- Is the intended first Studio task "pick a partition and scale" or "adjust the source and palette"? The control hierarchy should choose one.
- Should Regions remain square-only for this release, or should the tab stay visible with a clear "Square only" explanation to preview the capability?
