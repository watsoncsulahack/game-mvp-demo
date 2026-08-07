import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (name) => fs.readFileSync(path.join(projectRoot, name), 'utf8');

test('the app uses separate HTML, CSS, and JavaScript entry files', () => {
  const html = read('index.html');

  assert.ok(fs.existsSync(path.join(projectRoot, 'styles.css')), 'styles.css should exist');
  assert.ok(fs.existsSync(path.join(projectRoot, 'app.js')), 'app.js should exist');
  assert.match(html, /<link[^>]+href=["']styles\.css["']/i);
  assert.match(html, /<script[^>]+src=["']app\.js["'][^>]*><\/script>/i);
  assert.doesNotMatch(html, /<style(?:\s[^>]*)?>/i);
  assert.doesNotMatch(html, /<script(?![^>]+src=)[^>]*>\s*\S/i);
});

test('Campus Buddy is the user-facing identity and has a project design specification', () => {
  const html = read('index.html');
  const javascript = read('app.js');
  const design = read('DESIGN.md');

  assert.match(html, /<title>Campus Buddy MVP Demo<\/title>/);
  assert.doesNotMatch(`${html}\n${javascript}`, /\bPALs?\b/);
  assert.match(design, /^name: Campus Buddy$/m);
  assert.match(design, /## Overview/);
  assert.match(design, /## Do's and Don'ts/);
});

test('cross-mode accessibility contracts are present', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const javascript = read('app.js');

  assert.match(css, /:focus-visible/);
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /safe-area-inset-(?:top|bottom)/);
  assert.doesNotMatch(javascript, /event\.key\s*===\s*['"]Tab['"]/);

  for (const id of ['dialogueMode', 'quickChat', 'consoleMode']) {
    assert.match(html, new RegExp(`<section[^>]+id=["']${id}["'][^>]+role=["']dialog["'][^>]+aria-modal=["']true["']`));
  }

  for (const direction of ['up', 'left', 'right', 'down']) {
    assert.match(html, new RegExp(`<button[^>]+data-move=["']${direction}["'][^>]+aria-label=`));
  }
});

test('the three official dorm themes also skin Console mode', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const javascript = read('app.js');

  for (const name of ['Fresh Daytime Dorm', 'Cozy Warm Dorm', 'Gamer Dorm']) {
    assert.match(html, new RegExp(name));
  }

  assert.match(javascript, /document\.documentElement\.dataset\.roomTheme\s*=\s*state\.room/);
  for (const key of ['sunlit', 'creative', 'tech']) {
    assert.match(css, new RegExp(`data-room-theme=["']${key}["']`));
  }
  assert.match(css, /--console-shell-start/);
  assert.match(css, /var\(--console-shell-start\)/);
});

test('character creation exposes an accessible four-view turntable', () => {
  const html = read('index.html');
  const javascript = read('app.js');
  const design = read('DESIGN.md');

  assert.match(html, /id="rotateBuddyLeft"[^>]+aria-label="Rotate Buddy left"/);
  assert.match(html, /id="rotateBuddyRight"[^>]+aria-label="Rotate Buddy right"/);
  assert.match(html, /id="rotationStatus"[^>]+aria-live="polite"/);
  assert.match(javascript, /const PREVIEW_ANGLES\s*=\s*\[0,90,180,270\]/);
  assert.match(javascript, /state\.previewAngle/);
  assert.match(javascript, /event\.clientX-startX/);
  assert.doesNotMatch(javascript, /event\.clientY-startY/);
  assert.match(design, /four-direction|four direction|four-view/i);
  assert.match(design, /horizontal drag|horizontal swipe/i);
});

test('the default Buddy is a cohesive customizable electronic blank canvas', () => {
  const html = read('index.html');
  const javascript = read('app.js');
  const css = read('styles.css');
  const design = read('DESIGN.md');

  assert.match(javascript, /electronic blank canvas/i);
  assert.match(javascript, /data-base-body/);
  assert.match(javascript, /data-signal-eye/);
  assert.match(javascript, /function hairMarkup/);
  assert.match(javascript, /function outfitMarkup/);
  assert.match(html, /Hair style|Starter clothing/);
  assert.match(html, /<legend>Color<\/legend>/);
  assert.match(design, /blank canvas/i);
  assert.match(design, /cohesive/i);
});

test('onboarding owns the visual viewport without horizontal clipping', () => {
  const html = read('index.html');
  const css = read('styles.css');
  const javascript = read('app.js');

  assert.match(html, /class="design-fields"/);
  assert.match(css, /--app-visual-viewport-height/);
  assert.match(javascript, /window\.visualViewport/);
  assert.match(css, /overflow-x:\s*hidden/);
  assert.match(css, /orientation:\s*portrait/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,/);
  assert.match(css, /\.design-fields[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.design-grid[^}]*grid-template-rows:\s*minmax\(0,1fr\)\s+auto/s);
});

test('portrait onboarding removes clutter and offers RGB controls', () => {
  const html=read('index.html'), css=read('styles.css');
  assert.doesNotMatch(html,/Your practical campus companion|BUDDY CONCEPT ART|Local prototype\.|Default form · Electronic blank canvas|Electronic shell/);
  for(const id of ['shellR','shellG','shellB','signalR','signalG','signalB']) assert.match(html,new RegExp(`id="${id}"[^>]+type="range"|type="range"[^>]+id="${id}"`));
  assert.match(css,/@media[^}]+max-width:\s*700px[\s\S]+\.rotation-controls\s*\{[^}]*display:\s*none/i);
});

test('starting Home is selected before initialization', () => {
  const html=read('index.html'), javascript=read('app.js');
  const start=html.indexOf('data-step="3"'), end=html.indexOf('</section>',start);
  assert.match(html.slice(start,end),/data-room="sunlit"/);
  assert.doesNotMatch(html,/id="roomSelect"/);
  assert.match(javascript,/function initializePal[\s\S]+enterGame\(\)/);
});

test('game navigation uses Home and portrait overlays stay in the viewport', () => {
  const html=read('index.html'), css=read('styles.css'), javascript=read('app.js');
  assert.match(html,/>Home<\/button>/);
  assert.doesNotMatch(html,/SHARK<\/span>/);
  assert.match(css,/\.app-panel\s*\{[\s\S]*position:\s*fixed/i);
  assert.match(css,/\.touch-controls\s*\{[\s\S]*position:\s*absolute/i);
  assert.match(javascript,/Math\.max\(canvasWidth\/16,canvasHeight\/10\)/);
  assert.match(javascript,/\.touch-controls \[data-move\]/);
});

test('Console is a visible assistant app with the customized low-resolution head', () => {
  const html=read('index.html'), javascript=read('app.js');
  assert.match(html,/id="consoleButton"[^>]*>Console<\/button>/);
  assert.match(html,/aria-label="Buddy Console"/);
  assert.match(javascript,/data-console-head/);
  assert.match(javascript,/state\.pal\.hair/);
  assert.match(html,/data-console-tool="talk"/);
  assert.match(javascript,/function roomSceneSvg[\s\S]+id="entityFill"/);
});
