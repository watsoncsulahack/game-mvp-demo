import assert from 'node:assert/strict';
import test from 'node:test';
import { loadBrowserScripts } from './helpers.mjs';

const context = loadBrowserScripts(['src/state.js','src/character.js','src/room.js','src/explorer.js']);
const room = context.CampusBuddyRoom;
const explorer = context.CampusBuddyExplorer;

test('Home and Explorer share one canonical room object model', () => {
  assert.equal(Array.from(room.ROOM_OBJECTS,object=>object.id).join(','),'bed,desk,bookshelf,window');
  for (const object of room.ROOM_OBJECTS) {
    assert.ok(object.grid);
    assert.ok(object.anchor);
    assert.ok(object.buddy);
    assert.ok(object.label);
  }
});

test('collision is derived from canonical room geometry', () => {
  assert.equal(explorer.isBlocked(1,3),true,'bed blocks movement');
  assert.equal(explorer.isBlocked(8,7),false,'center rug remains walkable');
  assert.equal(explorer.isBlocked(0,7),true,'room boundary blocks movement');
});

test('nearest object returns an interaction only within range', () => {
  assert.equal(explorer.nearestObject({x:4,y:4})?.id,'bed');
  assert.equal(explorer.nearestObject({x:8,y:7}),null);
});
