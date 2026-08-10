import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { loadBrowserScripts, root } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js']);
const state = context.CampusBuddyCore.createState();
const character = context.CampusBuddyCharacter;
const angles = [0,45,90,135,180,225,270,315];
const slugs = ['front','left-quarter-front','left-side','left-quarter-rear','rear','right-quarter-rear','right-side','right-quarter-front'];

test('turnaround maps eight angles to eight separate authored PNG files', () => {
  assert.equal(character.TURNAROUND_VIEWS.length,8);
  assert.deepEqual(Array.from(character.TURNAROUND_VIEWS,view=>view.angle),angles);
  assert.deepEqual(Array.from(character.TURNAROUND_VIEWS,view=>view.slug),slugs);
  assert.equal(new Set(Array.from(character.TURNAROUND_VIEWS,view=>view.file)).size,8);
  for (const view of character.TURNAROUND_VIEWS) {
    assert.equal(view.file,`assets/buddy/turnaround/views/${view.slug}.png`);
  }
});

test('default rendering uses the authored view PNG directly with no reconstruction masks', () => {
  for (const [index,angle] of angles.entries()) {
    const svg=character.renderCharacter(state.buddy,{angle});
    assert.match(svg,new RegExp(`href="assets/buddy/turnaround/views/${slugs[index]}\\.png"`));
    assert.match(svg,/data-authored-turnaround="true"/);
    assert.doesNotMatch(svg,/layers-atlas\.png/);
    assert.doesNotMatch(svg,/<path\b/);
    assert.doesNotMatch(svg,/undefined|NaN/);
  }
});

test('all eight authored PNG files exist and are valid PNGs', () => {
  for (const slug of slugs) {
    const file=path.join(root,'assets/buddy/turnaround/views',`${slug}.png`);
    assert.ok(fs.existsSync(file),`${slug}.png should exist`);
    const data=fs.readFileSync(file);
    assert.ok(data.length>1000,`${slug}.png should contain image data`);
    assert.equal(data.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
  }
});

test('customization overlays keep the direct authored PNG as the base at every angle', () => {
  state.buddy.appearance.bodyColor='#DDEEFF';
  state.buddy.appearance.eyeColor='#2244AA';
  state.buddy.appearance.hairStyle='bob';
  state.buddy.appearance.hairColor='#775599';
  state.buddy.appearance.outfit='hoodie';
  for (const [index,angle] of angles.entries()) {
    const svg=character.renderCharacter(state.buddy,{angle});
    assert.match(svg,new RegExp(`href="assets/buddy/turnaround/views/${slugs[index]}\\.png"`));
    assert.match(svg,/layers-atlas\.png/);
    assert.match(svg,/#DDEEFF/);
    assert.match(svg,/#2244AA/);
    assert.match(svg,/#775599/);
  }
});
