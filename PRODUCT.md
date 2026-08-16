# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pigment is for artists and visually curious people who want an approachable space to play with images, grids, and color. People may arrive to make something surprising, learn how image-processing algorithms behave, or test visual ideas they can carry into their own creative practice. It is an experimental art tool, not a substitute for a handmade medium.

## Product Purpose

Pigment is primarily an interactive visual toy: a place to mess around, make cool things, and develop intuition for how algorithms transform images and color. Practical output is supported, but exporting a finished asset is secondary to playful exploration and learning through direct manipulation.

Success means a visitor can begin experimenting quickly, discover an interesting visual result, understand a little more about the process that produced it, and optionally take that result into their own work.

## Positioning

Pigment combines a hands-on browser studio, inspectable image-sampling and quantization methods, perceptual color controls, interactive lessons, and a searchable palette archive. The algorithms are not hidden automation: artists can compare methods, alter palettes, select regions, and refine individual cells while seeing the result immediately.

## Operating Context

The core experience is an unauthenticated browser playground. Artists can bring in an image, sample or choose a palette, try conversion methods, adjust and reorder colors, inspect how the algorithms behave, manually refine the result, and export it when useful. The learning lab supports experimentation with sampling, quantization, dithering, palette matching, and palette extraction. The catalog supports browsing and reusing color systems.

Accounts may be added later for optional persistence or synchronization, but access to the core playground must never require authentication.

## Capabilities and Constraints

- Image decoding, processing, editing, and rendering happen locally in the browser. Uploaded artwork is not sent to a processing service. This is a data-privacy guarantee, not a promise that the entire site works without a network connection.
- The studio supports source images in PNG, JPEG, WebP, and GIF formats. SVG is not supported as a source image.
- Palettes can be imported from images, JSON arrays, or text files containing CSS colors.
- Artwork exports as a crisp PNG at 1×, 2×, 4×, or 8× logical-pixel scale. These current import and export formats must be preserved when capabilities expand.
- Palettes can be extracted, edited, reordered, adjusted in perceptual color space, loaded from the catalog, and stored locally in the browser.
- Catalog palettes contain no more than 64 colors. The shared catalog may use PostgreSQL, but private artwork processing remains local.
- Pigment is free and open source under the MIT License. The repository includes the applicable MIT license notice and declares MIT package metadata; both must be preserved.
- The web app and `packages/ui` share one product context. `packages/ui` provides the reusable React components and styles that support Pigment's interfaces.

## Brand Commitments

- Preserve the name **Pigment**.
- Preserve the pig mascot and existing brand assets, including `assets/pigment-pig.svg`, unless the product owner explicitly changes them.
- Product language should be inviting, curious, direct, and technically honest. It should welcome play without overstating practical outcomes or hiding the algorithms behind vague claims.
- Pigment remains free and open source.

## Evidence on Hand

- The unified Next.js application contains the studio at `/studio`, interactive lessons at `/learn`, and the palette catalog at `/palettes`.
- `apps/web/components/studio/` contains the browser editor, conversion controls, selection and painting tools, palette adjustments, and preview surfaces.
- `apps/web/components/learn/` contains interactive explanations and experiments for the image-processing pipeline.
- `apps/web/palettes/` contains the palette-strip source assets used by the catalog.
- `assets/pigment-pig.svg`, `packages/ui/src/pig-mascot.tsx`, and `packages/ui/src/brand-mark.tsx` are existing brand assets.
- Current code demonstrates local image processing and PNG export. No testimonials, customer claims, usage benchmarks, or formal product research are on hand and future work must not fabricate them.
- The product owner confirmed MIT licensing. `LICENSE` and the workspace package metadata record that commitment.

## Product Principles

1. **Play before productivity.** Optimize for immediate experimentation, surprising results, and the desire to keep tinkering; practical export supports the play rather than defining it.
2. **Make the machinery tangible.** Let artists compare, inspect, and manipulate algorithmic decisions instead of presenting image processing as unexplained magic.
3. **Keep private work local.** Artwork processing and editing stay in the browser, with clear language about what does and does not leave the device.
4. **Welcome every artist.** Do not assume prior image-processing or technical expertise; preserve depth without making curiosity pass a knowledge test.
5. **Keep the playground open.** The core experience remains free, open source, and available without an account even if optional authenticated features arrive later.

## Accessibility & Inclusion

Target WCAG 2.2 Level AA for the web experience. Core workflows must remain keyboard operable, expose meaningful names and states to assistive technology, provide visible focus, avoid relying on color alone, maintain sufficient contrast, support reduced motion, and remain usable under text zoom and responsive reflow. Visual and algorithmic concepts should be explained in plain language without assuming technical vocabulary or prior image-processing experience.
