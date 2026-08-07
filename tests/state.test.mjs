import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserScripts } from './helpers.mjs';

const { CampusBuddyCore: core } = loadBrowserScripts(['src/state.js']);

test('canonical state stores one appearance representation', () => {
  const state = core.createState();
  assert.deepEqual(Object.keys(state.buddy.appearance).sort(), ['bodyColor','eyeColor','hairColor','hairStyle','outfit']);
  assert.equal('shell' in state.buddy, false);
  assert.equal('signal' in state.buddy, false);
});

test('profile helpers validate demo emails and create stable local identity', () => {
  assert.equal(core.validateEmail('mika@student.csulb.edu'), true);
  assert.equal(core.validateEmail('mika@example.com'), false);
  const first = core.profileFromEmail('mika@student.csulb.edu');
  const second = core.profileFromEmail('mika@student.csulb.edu');
  assert.equal(first.campus, 'California State University, Long Beach');
  assert.equal(first.identity, second.identity);
  assert.match(first.identity, /^BUDDY-[0-9A-F]{6}$/);
});

test('angle and color helpers are deterministic', () => {
  assert.equal(core.normalizeAngle(-90),270);
  assert.equal(core.normalizeAngle(451),90);
  assert.equal(core.hslToHex(0,100,50),'#FF0000');
  assert.equal(core.hslToHex(120,100,50),'#00FF00');
});

test('calculator parses arithmetic without dynamic code execution', () => {
  assert.equal(core.evaluateArithmetic('12 * (4 + 1)'),60);
  assert.equal(core.evaluateArithmetic('10 % 4 + 3'),5);
  assert.equal(core.evaluateArithmetic('-5 + 2'),-3);
  assert.throws(()=>core.evaluateArithmetic('alert(1)'));
  assert.throws(()=>core.evaluateArithmetic('1 / 0'));
});
