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
- `DESIGN.md` — product and visual design notes.

No build step or package install is required. The scripts are classic browser scripts so the demo still works when `index.html` is opened directly from disk.

The Buddy clothing-overlay system is still evolving. The current implementation uses aligned authored assets, but the longer-term asset workflow and layering model are still in progress.

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

## Verify

```sh
node --test tests/*.test.mjs
node --check app.js
for file in src/*.js; do node --check "$file"; done
```
