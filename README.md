# Campus Buddy MVP Demo

A dependency-free browser prototype for a responsive college-companion game. It includes Buddy onboarding and customization, Home and Explorer views of one shared room state, dialogue, lightweight campus tools, and Console Mode.

## Architecture

The repository intentionally keeps each subsystem small so humans and coding agents can load only the files relevant to a task.

- `index.html` — semantic application structure only.
- `styles/base.css` — tokens, resets, shared buttons, focus, and utilities.
- `styles/onboarding.css` — onboarding and Buddy customization layout.
- `styles/game.css` — Home, Explorer, navigation, and responsive game layout.
- `styles/overlays.css` — dialogue, panels, toast, and Console Mode.
- `src/state.js` — canonical state factory and pure utility functions.
- `src/character.js` — asset-driven Buddy turnaround renderer.
- `assets/buddy/turnaround/` — eight-view body and aligned transparent clothing layers.
- `src/room.js` — canonical room/theme/object model and Home rendering.
- `src/explorer.js` — Explorer collision, movement, and canvas rendering.
- `src/ui.js` — reusable overlay, panel, and Console content helpers.
- `app.js` — DOM orchestration and feature initialization.
- `DESIGN.md` — product and visual invariants.

No build step or package install is required. The scripts are classic browser scripts so the demo still works when `index.html` is opened directly from disk.

## Run locally

Open `index.html` in a modern browser.

## Demo path

1. Start the sample profile or enter a university email.
2. Customize the Buddy and inspect all eight authored turnaround views.
3. Choose a starting dorm and initialize.
4. Switch between Home and Explorer Mode.
5. Select the Buddy for dialogue or use the bottom application dock.
6. Open Console Mode for brief, wallet, calculator, focus, and talk demos.

Explorer Mode supports WASD/arrow keys, E/Enter/Space to interact, pointer interaction, and labeled touch controls.

## Figma capture frames

The character uses regular HTML image layers so browser-to-Figma capture tools
do not need to interpret nested SVG images or luminance masks. These query
parameters open deterministic demo states:

- `?frame=customizer` — wardrobe screen with the move-in look equipped
- `?frame=customizer-empty` — wardrobe screen with all clothing cleared
- `?frame=review` — completed review state
- `?frame=home` — initialized Home state
- `?frame=turnaround` — eight-view clothing alignment board

Wait until the root `<html>` element reports `data-character-assets="ready"`
before capturing if the page or network is still loading.

## Character asset contract

The Buddy anatomy is not defined by runtime SVG path coordinates. The renderer selects one authored body PNG and stacks independently selectable top, bottom, and footwear PNGs on a shared `256 × 640` logical frame. Every view uses the same bottom-center anchor at `(128, 640)`. New selectable items must ship all eight aligned views before they are exposed in onboarding.

## Verify

```sh
node --test tests/*.test.mjs
node --check app.js
node --check src/state.js
node --check src/character.js
node --check src/room.js
node --check src/explorer.js
node --check src/ui.js
```

## Implementation invariants

- Home and Explorer consume one canonical room-object model.
- Buddy appearance has one canonical state representation.
- Buddy onboarding rotation uses the eight authored turnaround views in 45-degree steps.
- Responsive layouts must not introduce horizontal page scrolling.
- Every pointer interaction that matters has a keyboard or button alternative.
- Rendering modules stay free of application event binding.
