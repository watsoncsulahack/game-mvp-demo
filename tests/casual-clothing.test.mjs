import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadBrowserScripts, root } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const character = context.CampusBuddyCharacter;
const views = Array.from(character.TURNAROUND_VIEWS);

const casualLayers = [
  ['tops/shirts/tee-classic','top'],
  ['bottoms/jeans-wide-leg','bottoms'],
  ['footwear/shoes/sneakers-low-top','shoes']
];

test('casual outfit renders uploaded clothing for every turnaround view', () => {
  state.buddy.appearance.outfit = 'tee';
  for (const view of views) {
    const svg = character.renderCharacter(state.buddy,{angle:view.angle});
    for (const [folder,id] of casualLayers) {
      assert.match(svg,new RegExp(`href="assets/buddy/turnaround/clothing/${folder}/${view.slug}\\.png"`));
      assert.match(svg,new RegExp(`data-clothing-layer="casual-${id}"`));
    }
  }
});

test('all casual clothing turnaround assets exist and are PNG files', () => {
  for (const [folder] of casualLayers) {
    for (const view of views) {
      const file = path.join(root,'assets/buddy/turnaround/clothing',folder,`${view.slug}.png`);
      assert.ok(fs.existsSync(file),`${folder}/${view.slug}.png should exist`);
      const data = fs.readFileSync(file);
      assert.ok(data.length > 1000,`${folder}/${view.slug}.png should contain image data`);
      assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    }
  }
});
