# Buddy turnaround assets

`layers-atlas.png` is derived from the supplied Buddy turnaround. It contains eight fixed logical 256x640 cells per row in this order: front, left quarter front, left side, left quarter rear, rear, right quarter rear, right side, right quarter front. The packed raster may be stored at a lower resolution and scaled by the SVG renderer; the logical cell contract stays 256x640.

Rows contain the canonical body, line art, eye mask, three hair styles plus their line masks, and three outfit styles plus their line masks. `src/character.js` maps layer names and view indexes to atlas cells; it does not define anatomy with runtime SVG paths.

A selectable hair or clothing option is complete only when its atlas row contains all eight views.