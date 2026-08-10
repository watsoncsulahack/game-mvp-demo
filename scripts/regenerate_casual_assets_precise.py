"""Regenerate the Casual PNG set, then re-author right-side views from their own canonical masks.

The base generator cleans every asset. This precision pass deliberately does NOT mirror the
right-side views: each right-quarter/right-side garment is rebuilt against the actual authored
right-side Buddy geometry from layers-atlas.png.
"""
from pathlib import Path
import runpy

ROOT = Path(__file__).resolve().parents[1]
ns = runpy.run_path(str(ROOT / 'scripts/generate_casual_assets.py'))

VIEWS = ns['VIEWS']
idx_by_slug = {slug: i for i, slug in enumerate(VIEWS)}
paths = ns['paths']
clean_final = ns['clean_final']
tee_asset = ns['tee_asset']
pants_asset = ns['pants_asset']
shoes_asset = ns['shoes_asset']

# Rebuild all views from their own authored geometry. This also makes the process explicit and
# protects against future left/right asymmetry in the hand-authored turnaround.
for slug in VIEWS:
    idx = idx_by_slug[slug]
    clean_final(tee_asset(idx)).save(paths['tee'] / f'{slug}.png', optimize=True)
    clean_final(pants_asset(idx, slug)).save(paths['pants'] / f'{slug}.png', optimize=True)
    clean_final(shoes_asset(idx, slug)).save(paths['shoes'] / f'{slug}.png', optimize=True)

print('Precision pass complete: all 24 PNGs use their own canonical view geometry.')
