import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { read, root } from './helpers.mjs';

const CANONICAL_STYLES = [
  'styles/base.css',
  'styles/onboarding.css',
  'styles/game.css',
  'styles/overlays.css',
  'styles/campus-apps.css',
  'styles/campus-finance.css',
  'styles/campus-bookstore.css',
  'styles/campus-ui.css',
  'styles/buddy.css',
  'styles/demo.css'
];

const CANONICAL_SCRIPTS = [
  'src/state.js',
  'src/character.js',
  'src/room.js',
  'src/explorer.js',
  'src/ui.js',
  'src/campus-apps.js',
  'src/campus-email-qr.js',
  'src/campus-bookstore.js',
  'src/campus-bookstore-ui.js',
  'src/campus-course-store.js',
  'src/campus-bookstore-checkout.js',
  'src/campus-finance.js',
  'src/buddy.js',
  'src/demo.js',
  'src/demo-ui.js',
  'app.js'
];

const HISTORICAL_FRAGMENTS = [
  'src/campus-faucet-integration.js',
  'src/campus-faucet-integration-v4.js',
  'src/campus-app-runtime.js',
  'src/buddy-demo-runtime.js',
  'src/campus-bookstore-integration.js',
  'src/campus-bookstore-selection.js',
  'src/campus-bookstore-parity.js',
  'src/campus-bookstore-wallet-checkout-v2.js',
  'src/demo-checkout-edge-fix.js',
  'src/demo-storefront-cleanup.js',
  'src/demo-refinement.js',
  'src/demo-bookstore-postflight.js',
  'src/demo-ui-regression-fix-v3.js',
  'styles/campus-currencies.css',
  'styles/campus-faucet-drops.css',
  'styles/campus-faucet-cards.css',
  'styles/campus-swap.css',
  'styles/campus-bookstore-catalog.css',
  'styles/campus-bookstore-overlays.css',
  'styles/campus-bookstore-responsive.css',
  'styles/campus-bookstore-selection.css',
  'styles/campus-bookstore-parity.css',
  'styles/campus-bookstore-wallet-checkout.css',
  'styles/campus-app-runtime.css',
  'styles/buddy-demo-runtime.css',
  'styles/demo-refinement.css',
  'styles/demo-regression-fix.css',
  'styles/demo-regression-fix-v2.css',
  'styles/demo-storefront-cleanup.css',
  'styles/demo-ui-regression-fix-v3.css'
];

test('entrypoint explicitly loads the canonical game files', () => {
  const html = read('index.html');
  for (const file of [...CANONICAL_STYLES, ...CANONICAL_SCRIPTS]) {
    assert.ok(fs.existsSync(`${root}/${file}`), `${file} should exist`);
    assert.match(html, new RegExp(file.replace(/[./]/g, '\\$&')), `${file} should be loaded explicitly`);
  }
  assert.doesNotMatch(html, /<style(?:\s[^>]*)?>/i);
  assert.doesNotMatch(html, /<script(?![^>]+src=)[^>]*>\s*\S/i);
});

test('historical patch-stack files stay removed', () => {
  const html = read('index.html');
  for (const file of HISTORICAL_FRAGMENTS) {
    assert.equal(fs.existsSync(`${root}/${file}`), false, `${file} should not return as a standalone fragment`);
    assert.doesNotMatch(html, new RegExp(file.replace(/[./]/g, '\\$&')));
  }
});

test('app orchestration stays separate from subsystem implementations', () => {
  const app = read('app.js');
  assert.ok(app.split('\n').length < 300, 'app.js should remain orchestration, not a monolith');
  assert.doesNotMatch(app, /M\d{3}\s\d{2}C\d{3}/, 'large SVG geometry belongs in the character module');
});

test('source avoids historical architecture hazards', () => {
  const javascript = ['app.js','src/state.js','src/character.js','src/room.js','src/explorer.js','src/ui.js'].map(read).join('\n');
  const css = ['styles/base.css','styles/onboarding.css','styles/game.css','styles/overlays.css'].map(read).join('\n');
  assert.doesNotMatch(javascript, /\bFunction\s*\(/, 'calculator must not use dynamic Function evaluation');
  assert.doesNotMatch(javascript, /vm\.runInNewContext/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /safe-area-inset-(?:top|bottom)/);
});

test('dialogs and movement controls keep accessible semantics', () => {
  const html = read('index.html');
  for (const id of ['dialogueMode','quickChat','consoleMode','appPanel']) {
    assert.match(html, new RegExp(`id="${id}"[^>]+role="dialog"[^>]+aria-modal="true"`));
  }
  for (const direction of ['up','left','right','down']) {
    assert.match(html, new RegExp(`data-move="${direction}"[^>]+aria-label=`));
  }
});
