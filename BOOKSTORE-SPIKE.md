# Bookstore direction A: one coherent module

This branch is an architecture spike, not a runtime migration. The existing game remains intact.

## Question this branch answers

Would the Bookstore be easier to understand if the historical `campus-bookstore-ui.js` behavior were absorbed into one purpose-named `bookstore.js` rather than remaining a post-render DOM patch layer?

## Shape

- Keep product data inside `bookstore.js` for now.
- Rename `createState()` conceptually to `createInitialState()`.
- Group state by navigation, catalog/filter state, overlays, and commerce state.
- Render the correct card the first time instead of rendering and then decorating it from a second file.
- Keep cart calculations against the in-memory model instead of parsing prices and quantities back out of DOM text.
- Do not introduce a backend, database, blockchain adapter, framework, or folder hierarchy yet.

Inspect `src/bookstore.js` as the proposed direction. It is deliberately small enough to read top-to-bottom.
