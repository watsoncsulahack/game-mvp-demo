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
- The Buddy can be inspected in four 90-degree views by horizontal drag/swipe, arrow keys, or explicit rotate buttons.

## Buddy character

The default Buddy is a cohesive customizable blank canvas: one pale humanoid silhouette, a heavy near-black outline, two vertical eyes in front view, one eye in side views, and no eyes in rear view. Hair, body color, eye color, clothing, and disposition are optional layers over that base.

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

## Don'ts

- Do not turn the Buddy stage into a dense sci-fi scan screen.
- Do not replace the simple silhouette with a segmented robot or realistic human.
- Do not duplicate room coordinates in multiple renderers.
- Do not add historical CSS override passes; update the owning component stylesheet instead.
- Do not make tests depend on function order or exact SVG path coordinates.
