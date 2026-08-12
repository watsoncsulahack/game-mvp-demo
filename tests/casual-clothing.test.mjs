import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadBrowserScripts, root } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const character = context.CampusBuddyCharacter;

test('move-in look is three independently selectable garment layers', () => {
  assert.deepEqual(
    Object.fromEntries(Object.entries(character.equippedLayers(state.buddy.appearance))),
    {top:'tee-classic',bottom:'jeans-wide-leg',footwear:'sneakers-low-top'}
  );
  const markup=character.renderCharacter(state.buddy);
  const body=markup.indexOf('data-character-layer="body"');
  const top=markup.indexOf('data-character-layer="top"');
  const bottom=markup.indexOf('data-character-layer="bottom"');
  const footwear=markup.indexOf('data-character-layer="footwear"');
  assert.ok(body<top&&top<bottom&&bottom<footwear,'layers should render in canonical order');
});

test('each selectable garment ships a transparent PNG for all eight views', () => {
  for (const category of character.LAYER_ORDER) {
    for (const [id,item] of Object.entries(character.CLOTHING_CATALOG[category])) {
      if (!item.root) continue;
      for (const view of character.TURNAROUND_VIEWS) {
        const relative=character.layerFile(category,id,view);
        const file=path.join(root,relative);
        assert.ok(fs.existsSync(file),`${category}/${id}/${view.slug} should exist`);
        const data=fs.readFileSync(file);
        assert.ok(data.length>1000,`${relative} should contain image data`);
        assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
      }
    }
  }
});

test('unknown or legacy garment values safely fall back to no layer', () => {
  Object.assign(state.buddy.appearance,{top:'hoodie',bottom:'missing',footwear:null});
  assert.deepEqual(
    Object.fromEntries(Object.entries(character.equippedLayers(state.buddy.appearance))),
    {top:'none',bottom:'none',footwear:'none'}
  );
});
