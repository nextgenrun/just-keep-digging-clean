import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { DugTilesSaveStore } from '../world/model/DugTilesSaveStore.js';
// Read an owned local-browser fixture; all restore writes use an in-memory store.
const fixture = path.resolve(process.argv[2] || '');
const allowed = path.resolve('testing/artifacts/player-data-2026-09-07') + path.sep;
assert.ok(fixture.startsWith(allowed), 'Supply a synthetic player-data test record');
const record = JSON.parse(await fs.readFile(fixture, 'utf8'));
assert.equal(record.data.kind, 'save');
const portable = JSON.parse(record.data.portableJson);
const entries = new Map();
const storage = { getItem: key => entries.get(key) ?? null,
  setItem: (key, value) => entries.set(key, String(value)), removeItem: key => entries.delete(key) };
globalThis.localStorage = storage;
globalThis.window = { localStorage: storage };
const store = new DugTilesSaveStore({ slotId: 3 });
assert.equal(store.backupManager.calculateChecksum(portable.saveData), portable.payloadChecksum);
const result = await store.importSave({ text: async () => record.data.portableJson });
assert.equal(result.success, true, JSON.stringify(result));
const restored = store.normalizePayload(store.loadFromLocalStorage());
for (const field of ['world', 'resources', 'playerStateData', 'hardcoreModeData', 'levelData'])
  assert.deepEqual(restored[field], portable.saveData[field], 'Server roundtrip changed ' + field);
assert.ok(entries.has('dig-game-save-slot-3'));
console.log('PLAYER_DATA_REAL_SAVE_ROUNDTRIP_OK', JSON.stringify({ slot: portable.slotId,
  version: restored.version, bytes: Buffer.byteLength(record.data.portableJson) }));
