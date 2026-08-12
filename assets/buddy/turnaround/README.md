# Buddy turnaround assets

The canonical character frame is `256 × 640` with a bottom-center anchor at
`(128, 640)`. The eight authored views are front, both quarter-fronts, both
sides, both quarter-rears, and rear.

## Layer contract

- `views/` contains the eight base Buddy PNGs.
- Selectable clothing under `clothing/` uses ordinary transparent PNGs with the
  same filenames, frame, scale, and bottom-center registration as the body.
- Runtime clothing order is body, top, bottom, footwear.
- Source artwork may be exported at a multiple of `256 × 640` as long as the
  transparent canvas preserves the same registration.

`layers-atlas.png` is retained only as a transitional cosmetic source for body
color, eye color, and the three authored hair styles. Clothing no longer uses
atlas masks or the old precomposited `outfits/casual/` assets. Future cosmetic
art can be migrated to the same aligned-PNG contract without changing the
clothing layer model.
