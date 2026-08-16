# Buddy clothing assets

This directory contains transparent PNG clothing overlays authored against the same eight-view Buddy turnaround used by `src/character.js`.

## Geometry contract

- Every asset is a transparent `256 x 640` PNG.
- The origin is the top-left of the canonical turnaround cell.
- Files are already positioned for the authored Buddy views, so the renderer should place them at `x=0`, `y=0`, `width=256`, `height=640` with no per-view translation or scale.
- Each selectable item ships all eight view slugs: `front`, `left-quarter-front`, `left-side`, `left-quarter-rear`, `rear`, `right-quarter-rear`, `right-side`, and `right-quarter-front`.
- The visible garment occupies only the pixels it needs; the rest of the image is transparent.

## Visual direction

These are rasterized cartoon garment drawings derived from the approved Casual concept rendering. They intentionally preserve softer clothing contours, rounded hems, openings, and perspective-specific silhouettes rather than using geometric SVG approximations. The clothing is kept relatively simple, with restrained shading and detail so it remains consistent with the Buddy art style.

## Current production set

The first complete preset is **Casual**:

- `tops/tee/classic/` — Classic Tee
- `pants/jeans/wide-leg/` — Wide Leg Jeans
- `shoes/sneakers/low-top/` — Low Top Sneakers

`manifest.json` is the machine-readable inventory and preset map.
