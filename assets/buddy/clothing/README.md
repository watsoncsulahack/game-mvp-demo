# Buddy clothing assets

This directory contains clothing overlays authored against the same eight-view Buddy turnaround used by `src/character.js`.

## Geometry contract

- Every asset uses a `256 x 640` canvas / SVG viewBox.
- The origin is the top-left of the canonical turnaround cell.
- Files are already positioned for the authored Buddy views, so the renderer should place them at `x=0`, `y=0`, `width=256`, `height=640` with no per-view translation or scale.
- Each selectable item ships all eight view slugs: `front`, `left-quarter-front`, `left-side`, `left-quarter-rear`, `rear`, `right-quarter-rear`, `right-side`, and `right-quarter-front`.
- Layers are transparent outside the garment.

## Current production set

The first complete preset is **Casual**:

- `tops/tee/classic/` — simplified classic ringer tee
- `pants/jeans/wide-leg/` — wide-leg jeans
- `shoes/sneakers/low-top/` — low-top sneakers

`manifest.json` is the machine-readable inventory and preset map.
