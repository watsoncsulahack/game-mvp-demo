# Bookstore direction C: durable asset metadata boundary

This branch is an architecture spike. The existing game remains intact.

## Question this branch answers

Should a product be able to carry optional durable digital-asset metadata without making the Bookstore depend on any particular external network or storage system?

## Shape

The sample in `data/products.js` separates ordinary commerce information from an optional `digitalAsset` block.

The Bookstore itself should need only:

- stable product ID and SKU
- name and description
- media URI and media type
- category and brand
- price and inventory
- optional course metadata

The optional digital-asset block contains durable descriptive metadata such as:

- name
- image URI
- media type
- description
- related files

A future integration adapter can translate that durable metadata into whatever external representation is selected later. Network-specific identifiers and serialization details stay outside `bookstore.js`.

## Why this differs from direction B

Direction B stops at a clean product catalog. Direction C adds one explicit optional boundary for products that may later have an external digital representation, while keeping ordinary products and the Bookstore renderer completely independent from that choice.
