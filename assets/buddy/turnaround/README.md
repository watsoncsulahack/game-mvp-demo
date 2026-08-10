# Buddy turnaround assets

The original eight-view turnaround sheet is the master art reference. The runtime does **not** crop that sheet and does not reconstruct the Buddy silhouette from vector paths or masks.

`views/` contains eight separate PNG files extracted once from the master sheet: `front.png`, `left-quarter-front.png`, `left-side.png`, `left-quarter-rear.png`, `rear.png`, `right-quarter-rear.png`, `right-side.png`, and `right-quarter-front.png`. `src/character.js` selects one of these authored images directly for the current 45-degree view.

`layers-atlas.png` is retained only for optional color, hair, and clothing overlays. It is not the source of the base body outline. The uncustomized Buddy therefore renders from the supplied turnaround pixels directly.

Future production hair, clothing, expression, pose, and sprite assets should follow the same rule: authored image files define geometry; code only selects and composes them.
