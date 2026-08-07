import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { read, root } from './helpers.mjs';

test('entrypoint is semantic markup with split CSS and JavaScript modules', () => {
  const html=read('index.html');
  for (const file of ['styles/base.css','styles/onboarding.css','styles/game.css','styles/overlays.css','src/state.js','src/character.js','src/room.js','src/explorer.js','src/ui.js','app.js']) {
    assert.ok(fs.existsSync(`${root}/${file}`),`${file} should exist`);
    assert.match(html,new RegExp(file.replace(/[./]/g,'\\$&')));
  }
  assert.doesNotMatch(html,/<style(?:\s[^>]*)?>/i);
  assert.doesNotMatch(html,/<script(?![^>]+src=)[^>]*>\s*\S/i);
});

test('orchestration stays small enough for focused agent context', () => {
  const app=read('app.js');
  assert.ok(app.split('\n').length<300,'app.js should remain orchestration, not a monolith');
  assert.doesNotMatch(app,/M\d{3}\s\d{2}C\d{3}/,'large SVG geometry belongs in the character module');
});

test('source avoids historical architecture hazards', () => {
  const javascript=['app.js','src/state.js','src/character.js','src/room.js','src/explorer.js','src/ui.js'].map(read).join('\n');
  const css=['styles/base.css','styles/onboarding.css','styles/game.css','styles/overlays.css'].map(read).join('\n');
  assert.doesNotMatch(javascript,/\bFunction\s*\(/,'calculator must not use dynamic Function evaluation');
  assert.doesNotMatch(javascript,/vm\.runInNewContext/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion:\s*reduce/);
  assert.match(css,/safe-area-inset-(?:top|bottom)/);
});

test('dialogs and movement controls keep accessible semantics', () => {
  const html=read('index.html');
  for (const id of ['dialogueMode','quickChat','consoleMode','appPanel']) {
    assert.match(html,new RegExp(`id="${id}"[^>]+role="dialog"[^>]+aria-modal="true"`));
  }
  for (const direction of ['up','left','right','down']) assert.match(html,new RegExp(`data-move="${direction}"[^>]+aria-label=`));
});
