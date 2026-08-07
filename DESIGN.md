---
name: Campus Buddy
status: prototype
---

# Campus Buddy Design

## Overview

Campus Buddy is a friendly, practical companion game for students. The approved onboarding mockups are the visual source of truth: a compact rounded application window, strong navy outlines, warm paper-and-grid surfaces, saturated cyan and cobalt framing, and a simple hand-drawn Buddy silhouette.

## Visual language

- Use dark navy outlines, small offset shadows, rounded corners, and mostly flat color.
- Balance cool cyan and cobalt with warm yellow highlights and cream paper.
- Keep the graph-paper panel subtle so labels, fields, and the Buddy remain dominant.
- Favor concise, playful copy over technical product language.
- Keep controls tactile but compact; this should feel like a friendly game setup screen, not a settings dashboard.

## Onboarding

The three-step flow is **Campus ID**, **Design Buddy**, then **Review**.

- Desktop uses a persistent Buddy stage on the left and the active form on the right.
- The Campus ID title intentionally wraps as “Create your” / “Buddy.” at the reference layout.
- The Design Buddy form uses two compact columns and keeps Back/Continue controls reachable at the bottom.
- Portrait layouts place the stage above an independently scrolling form without horizontal clipping.
- The Buddy can be inspected as a four-view turntable using horizontal drag/swipe, arrow keys, or focus-revealed rotation controls.

## Buddy character

The default Buddy is a cohesive, simple customizable blank canvas based on the supplied front, left-side, rear, and right-side drawings. It uses one pale humanoid silhouette, a heavy near-black hand-drawn outline, two vertical eyes in front view, one eye in side views, and no facial features in rear view. Hair, color, eye color, clothing, and disposition are optional customizations layered over that recognizable base.

## Console direction

Console mode is a dedicated handheld-style way to interact with the same Buddy. Its detailed interaction pass follows onboarding, but it must remain reachable as a clearly labeled mode and reuse the customized character identity rather than presenting a separate avatar.

## Accessibility and responsive behavior

- Preserve visible focus indicators, semantic forms, labels, status announcements, and reduced-motion behavior.
- Keep onboarding inside the visual viewport and respect device safe areas.
- Never require drag alone; keyboard and button alternatives must remain available.
- Do not allow the design form or footer to widen or clip the application shell.

## Do's and Don'ts

### Do

- Match the approved onboarding composition before adding ornamental details.
- Keep the character simple, warm, and instantly readable.
- Use the yellow active state consistently for steps and selected chips.
- Verify both reference desktop and narrow portrait layouts after visual changes.

### Don't

- Turn the Buddy stage into a dark sci-fi scan screen.
- Replace the hand-drawn silhouette with a segmented robot or realistic human.
- Add dense explanatory cards, unnecessary status text, or dashboard clutter.
- Hide essential navigation below an unreachable internal scroll area.
- Let future Console work redefine the onboarding visual language.
