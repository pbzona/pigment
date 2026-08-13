---
target: studio image selection
total_score: 34
max_score: 36
na_heuristics: 7
p0_count: 0
p1_count: 0
timestamp: 2026-08-13T16-56-35Z
slug: apps-web-components-studio-upload-dropzone-tsx
---
⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed; design review and detector/browser evidence were completed sequentially)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|---|---:|---|
| 1 | Visibility of System Status | 3 | Sample loading uses the existing image-reading state and failures appear inline; loading progress remains indeterminate. |
| 2 | Match System / Real World | 4 | “Choose image” and “start with a sample” are direct, familiar choices without onboarding language. |
| 3 | User Control and Freedom | 4 | Upload, drag/drop, sample selection, source links, and Learn remain freely available with no forced sequence. |
| 4 | Consistency and Standards | 4 | The chooser and sample cards use Pigment’s square frames, hard shadows, typography, and corrected brand mark. |
| 5 | Error Prevention | 4 | Accepted formats are explicit, sample assets are local and known-good, and source links are separate from selection targets. |
| 6 | Recognition Rather Than Recall | 4 | Three visual samples communicate the option immediately; titles, artists, license, and source are visible. |
| 7 | Flexibility and Efficiency | n/a | This arrival surface intentionally asks for one source choice; expert accelerators do not materially apply. |
| 8 | Aesthetic and Minimalist Design | 4 | One primary upload action and one compact sample row maintain clear hierarchy without turning into a tour. |
| 9 | Error Recovery | 3 | Upload and sample failures preserve the chooser and explain what failed; retry is implicit through another choice. |
| 10 | Help and Documentation | 4 | Privacy, supported formats, Learn, artist credit, license, and primary-source links are available at the point of choice. |
| **Total** | | **34/36** | **Excellent** |

## Design Specificity Verdict

The image-selection flow now feels native to Pigment: an artist can bring private work or immediately experiment with visually rich, art-relevant material. The three examples span print, painting, and photography without presenting themselves as a tutorial. Attribution is visible but subordinate to the images.

The CLI detector found no issues in changed source files. Browser injection initially identified an icon-tile stack and 10px source links; both were corrected in the final batch by reducing the upload icon to a semantic accent and raising source-link text to 11px. The remaining browser `transition: height` signal comes from framework animation CSS rather than this flow.

## Overall Impression

The chooser now gives hesitant visitors a zero-commitment path while preserving the direct upload path for artists with their own material. It feels like selecting working material, not completing onboarding.

## What's Working

1. The hierarchy is immediate: upload is primary, samples are an equally understandable secondary route.
2. Sample cards use real artwork and reveal enough attribution to be ethically and legally legible.
3. Local bundled files keep sample selection fast, private, and reliable after the app has loaded.

## Priority Issues

No P0 or P1 issues remain.

### [P3] Mobile sample browsing is vertically long

**Why it matters:** Three full-width cards require scrolling, though each card remains clear and comfortably tappable.

**Fix:** Keep the current stack unless usage shows abandonment; a horizontal carousel would hide choices and add interaction cost.

**Suggested command:** `/impeccable polish`

## Persona Red Flags

**Jordan (First-Timer):** The first action is clear, and a sample requires no file knowledge. No technical terms block entry.

**Sam (Accessibility-Dependent User):** Headings, buttons, source links, image dimensions, visible focus, and readable touch targets create a coherent keyboard/screen-reader path. Decorative thumbnails correctly avoid redundant alt text because card labels carry the identity.

**Casey (Mobile User):** Upload and sample targets are large and thumb-friendly. The only cost is vertical scrolling through all three samples.

## Minor Observations

- Public-domain source links are intentionally separate from the card button so selecting and learning about provenance cannot be confused.
- The three local files total roughly 1.2MB and Next Image serves responsive derivatives rather than forcing full-size downloads at every viewport.
- Sample-source evidence is preserved in `docs/research/sample-image-sources.md`.

## Questions to Consider

- If analytics later show one sample dominating, should it become the featured sample or should variety remain the point?
- Would future sample sets benefit from user-selectable categories, or would that overcomplicate a deliberately simple choice?
