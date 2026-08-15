# Maximum consolidation branch

This branch is the file-boundary experiment. The first implementation pass deliberately changes module boundaries before changing internal behavior.

## Runtime target

- `src/bookstore.js` replaces the standalone Bookstore core, Bookstore UI patch layer, course-store integration, and Bookstore checkout enhancement.
- `src/demo.js` replaces the base demo runtime plus the late demo UI synchronization layer.
- `src/apps.js`, `src/email-qr.js`, and `src/finance.js` replace the corresponding `campus-*` filenames without changing their contents.
- `src/buddy.js`, `src/character.js`, `src/explorer.js`, `src/room.js`, `src/state.js`, and `src/ui.js` remain independent because they already describe distinct subsystems.

The intended result is one file per coherent runtime category rather than one file per historical implementation pass.

## Review rule

Do not infer that a large file is finished architecture. The point of this branch is to expose all behavior for a subsystem in one place. Internal simplification, data modeling, persistence boundaries, and backend/blockchain adapters come after the consolidated behavior is reviewed and tested.
