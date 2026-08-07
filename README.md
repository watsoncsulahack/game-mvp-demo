# Campus Buddy MVP Demo

A local prototype for a responsive college-companion game. It combines a character-centered Buddy experience, visual-novel dialogue, three-quarter room exploration, practical campus tools, and a handheld-style Buddy Console.

## Project structure

- `index.html` — semantic application structure and mode markup
- `styles.css` — shared visual language, responsive layouts, room themes, and accessibility behavior
- `app.js` — prototype state, rendering, interactions, and mode transitions
- `DESIGN.md` — the source of truth for the intended Campus Buddy design system
- `tests/structure.test.mjs` — lightweight architecture, naming, theme, and accessibility contracts

## Live demo

[Open the GitHub Pages site](https://watsoncsulahack.github.io/game-mvp-demo/).

The site deploys automatically from `main` through `.github/workflows/pages.yml`.

## Run locally

Open `index.html` in a modern browser. No server, build step, account, or external dependency is required.

## Demo path

1. Choose **Start sample profile**.
2. Customize the Buddy’s initial form and disposition.
   - Drag or swipe horizontally across the preview to rotate through four 90-degree views.
   - Use the left/right preview buttons or Left/Right Arrow keys for the same rotation.
   - Keep the pale blank canvas untouched or use compact body, eye, and hair hue controls with optional starter clothing.
3. Select **Fresh Daytime Dorm**, **Cozy Warm Dorm**, or **Gamer Dorm** in the final onboarding step, then initialize directly into play.
4. Switch between Home and Explorer Mode.
5. Select the Buddy for Talk, Check in, Plan, and React actions.
6. Open the assistant-style Buddy Console with the labeled **Console** button and select the low-resolution Buddy head for tools.

Explorer Mode supports WASD or directional keys, E/Enter/Space to interact, pointer interaction, and labelled touch controls. Overlays can be closed with their close control or Escape.

Character creation uses a contained foldable layout: portrait screens stack a compact turntable over the form, while unfolded screens keep both columns inside the visual viewport. The customization fields own vertical scrolling and the Back/Continue footer remains reachable.

## Verify

```sh
node --test tests/structure.test.mjs
node --check app.js
npx -y @google/design.md lint DESIGN.md
```

The prototype remains intentionally local and in-memory. Persistence, real voice input, editable planning and study workflows, weather, and evolving Buddy personality are future implementation passes described by `DESIGN.md`.
