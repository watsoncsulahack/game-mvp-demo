# Bookstore direction B: data first

This branch is an architecture spike, not a runtime migration. The existing game remains intact.

## Question this branch answers

Should product identity and product metadata leave `bookstore.js` before the renderer itself is simplified?

## Shape

- `data/products.js` is a declarative catalog rather than Bookstore behavior.
- Product records have stable IDs and SKUs.
- Human-facing metadata (`name`, `description`, media) is separate from commerce metadata (category, price, inventory).
- Course assignment is metadata on a normal product, so a course book does not need a second product type, second cart, or second renderer.
- Media is referenced by URI instead of being drawn by Bookstore logic.
- The catalog is JavaScript only to preserve the current ability to open the game directly from `file://`. Its object shape is intentionally JSON-compatible and can later move to JSON, an API, or a database.
- `src/bookstore.js.example` shows how filtering and cart calculations consume this data without reading values back from the DOM.

This direction deliberately does not add Cardano-specific identifiers yet. It establishes the product schema first.
