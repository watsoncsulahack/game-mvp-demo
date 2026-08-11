import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadBrowserScripts, root } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const character = context.CampusBuddyCharacter;
const views = Array.from(character.TURNAROUND_VIEWS);

test('casual outfit uses precomposited Buddy frames instead of garment overlays', () => {
  state.buddy.appearance.outfit = 'tee';
  for (const view of views) {
    const svg = character.renderCharacter(state.buddy,{angle:view.angle});
    assert.match(svg,/assets\/buddy\/turnaround\/outfits\/casual\//);
    assert.match(svg,/data-precomposited-outfit="casual"/);
    assert.match(svg,/data-casual-outfit="true"/);
    assert.doesNotMatch(svg,/assets\/buddy\/turnaround\/clothing\//);
    assert.doesNotMatch(svg,/outfit-tee/);
  }
});

test('casual turnaround maps eight angles onto five authored precomposited files', () => {
  const expected = {
    front:['front.webp',false],
    'left-quarter-front':['left-quarter-front.webp',false],
    'left-side':['left-side.webp',false],
    'left-quarter-rear':['left-quarter-rear.webp',false],
    rear:['rear.webp',false],
    'right-quarter-rear':['left-quarter-rear.webp',true],
    'right-side':['left-side.webp',true],
    'right-quarter-front':['left-quarter-front.webp',true]
  };
  for (const view of views) {
    const asset = character.CASUAL_VIEWS[view.slug];
    assert.deepEqual([asset.file,asset.mirror],expected[view.slug]);
  }
});

test('authored casual precomposited WebP assets exist', () => {
  for (const fileName of ['front.webp','left-quarter-front.webp','left-side.webp','left-quarter-rear.webp','rear.webp']) {
    const file = path.join(root,'assets/buddy/turnaround/outfits/casual',fileName);
    assert.ok(fs.existsSync(file),`${fileName} should exist`);
    const data = fs.readFileSync(file);
    assert.ok(data.length > 1000,`${fileName} should contain image data`);
    assert.equal(data.subarray(0,4).toString('ascii'),'RIFF');
    assert.equal(data.subarray(8,12).toString('ascii'),'WEBP');
  }
});
