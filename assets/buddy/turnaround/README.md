# Buddy turnaround assets

The runtime uses ordinary transparent PNG layers. It does not use a texture
atlas or SVG masks.

## Frame contract

- Logical frame: `256 × 640`
- Anchor: bottom center (`128, 640`)
- Views: front, both quarter-fronts, both sides, both quarter-rears, and rear
- Layer order: body, top, bottom, footwear

`views/` contains the eight base Buddy renders. Each selectable item under
`clothing/` contains the same eight filenames. Source artwork may be exported
at a multiple of `256 × 640` (the jeans are currently 4×), but it must preserve
the same transparent frame, scale, and bottom-center anchor.

`layers-atlas.png` and `outfits/casual/` are legacy prototype artifacts. They
remain in the repository for comparison but are no longer referenced at
runtime. New items should be added as aligned PNG sets under `clothing/`.
