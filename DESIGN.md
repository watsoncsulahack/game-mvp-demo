---
name: Campus Buddy
status: prototype
---

# Campus Buddy Design

## Overview

Campus Buddy is a friendly, practical companion game for students. The visual language uses strong navy outlines, warm paper-and-grid surfaces, saturated cyan/cobalt framing, yellow active states, and a simple hand-drawn Buddy silhouette.

## Onboarding

The three-step flow is **Campus ID**, **Design Buddy**, then **Review**.

- Desktop keeps a persistent Buddy stage beside the active form.
- Portrait layouts place the stage above an independently scrolling form.
- Back/Continue controls remain reachable.
- The Buddy is inspected through eight authored turnaround views at 45-degree increments: front, left quarter front, left side, left quarter rear, rear, right quarter rear, right side, and right quarter front.
- Drag/swipe, arrow keys, and explicit rotate buttons all advance one authored view at a time.

## Buddy character

The supplied eight-view turnaround is the source of truth for anatomy and proportions. Runtime code must not reconstruct the body from hand-authored SVG path coordinates. The renderer composes aligned sprite-mask layers for the canonical body, line art, eyes, hair, and clothing.

Body color, eye color, hair style/color, clothing, and disposition remain onboarding customizations. Every selectable visual layer must have a valid representation for all eight turnaround views before it is exposed in the UI.

The current hair and clothing layers are starter assets that follow the eight-view contract. Future production model-sheet assets can replace those masks without changing the renderer or onboarding interaction model.

## Home and Explorer

Home and Explorer are two renderings of the same room state. Object positions, interaction anchors, and Buddy activity destinations must come from one canonical room model so the modes cannot drift apart.

## Console direction

Console Mode is a handheld-style way to interact with the same customized Buddy. It remains visibly secondary to Home and reuses the same identity and appearance state.

## Accessibility and responsive behavior

- Preserve visible focus indicators, semantic forms, labels, status announcements, and reduced-motion behavior.
- Respect device safe areas and the visual viewport.
- Never require drag alone; keyboard and button alternatives remain available.
- Dialog-like overlays move focus inside when opened and restore it when closed.
- Do not allow the design form, footer, or game controls to widen the viewport.

## Do's

- Keep controls tactile but compact.
- Favor concise, playful copy over technical product language.
- Use the yellow active state consistently for steps and selected chips.
- Keep state, rendering, and event binding in separate modules.
- Treat the turnaround assets as canonical geometry.

## Don'ts

- Do not turn the Buddy stage into a dense sci-fi scan screen.
- Do not replace the simple silhouette with a segmented robot or realistic human.
- Do not redraw Buddy anatomy with runtime SVG path strings.
- Do not ship a selectable customization that is missing any turnaround angle.
- Do not duplicate room coordinates in multiple renderers.
- Do not add historical CSS override passes; update the owning component stylesheet instead.
- Do not make tests depend on function order or exact SVG path coordinates.