import assert from "node:assert/strict";

import { WorldBackgroundTextureStream } from
  "../world/rendering/WorldBackgroundTextureStream.js";

const removed = [];
const sharedImage = {
  active: true,
  texture: { key: "depth-background" },
};
const nestedImage = {
  active: true,
  frame: { texture: { key: "nested-background" } },
};
const scene = {
  children: {
    list: [sharedImage, { active: true, list: [nestedImage] }],
  },
  textures: {
    exists: () => true,
    remove: key => removed.push(key),
  },
};
const stream = new WorldBackgroundTextureStream(scene, {}, {}, {
  getActiveObjects: () => [],
  isDestroyed: () => false,
  onBatchComplete: () => {},
  onTexturesQueued: () => {},
});
stream.ownedTextures.add("depth-background");
stream.ownedTextures.add("nested-background");

assert.equal(stream.removeOwnedTexture("depth-background"), false);
assert.equal(stream.removeOwnedTexture("nested-background"), false);
assert.deepEqual(removed, []);
assert.equal(stream.ownedTextures.has("depth-background"), true);
assert.equal(stream.ownedTextures.has("nested-background"), true);

sharedImage.active = false;
nestedImage.destroyed = true;
assert.equal(stream.removeOwnedTexture("depth-background"), true);
assert.equal(stream.removeOwnedTexture("nested-background"), true);
assert.deepEqual(removed, ["depth-background", "nested-background"]);

console.log("world background texture lifetime contract: ok");
