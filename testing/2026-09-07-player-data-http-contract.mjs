import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import net from 'node:net';
const root = process.cwd();
const base = path.join(root, 'testing/artifacts/player-data-2026-09-07/http-' + Date.now());
const publicRoot = path.join(base, 'public'), privateRoot = path.join(base, 'private');
for (const dir of ['api', 'server', 'values']) await fs.mkdir(path.join(publicRoot, dir), { recursive: true });
for (const file of ['api/player-data.php', 'server/PlayerDataConfig.php', 'server/PlayerDataValidation.php',
  'server/DualCopyPlayerDataStore.php', 'values/playerDataServer.php'])
  await fs.copyFile(path.join(root, file), path.join(publicRoot, file));
const port = await new Promise(resolve => { const probe = net.createServer(); probe.listen(0, '127.0.0.1', () => {
  const port = probe.address().port; probe.close(() => resolve(port));
}); });
const origin = 'http://127.0.0.1:' + port, configFile = path.join(privateRoot, 'config.php');
const php = 'C:/xampp/php/php.exe';
execFileSync(php, [path.join(root, 'tools/2026-09-07-configure-player-data.php'),
  '--config=' + configFile, '--primary=' + path.join(privateRoot, 'primary'),
  '--mirror=' + path.join(privateRoot, 'mirror'), '--public-root=' + publicRoot, '--origin=' + origin, '--local-test'],
  { windowsHide: true, stdio: 'pipe' });
const server = spawn(php, ['-S', '127.0.0.1:' + port, '-t', publicRoot], {
  windowsHide: true, stdio: 'ignore', env: { ...process.env, UNDERSTAR_PLAYER_DATA_CONFIG: configFile },
});
const endpoint = origin + '/api/player-data.php';
const post = (body, requestOrigin = origin) => fetch(endpoint, { method: 'POST',
  headers: { 'Content-Type': 'application/json', Origin: requestOrigin }, body: JSON.stringify(body) });
try {
  let available = false;
  for (let retry = 0; retry < 50; retry++) {
    try { if ((await fetch(endpoint)).status === 405) { available = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(available, 'PHP collector did not start');
  const batch = { schema: 1, kind: 'events', id: crypto.randomUUID(), session: crypto.randomUUID(),
    player: crypto.randomUUID(), createdAt: Date.now(), startedAt: Date.now(), build: 'http-test',
    events: [{ seq: 1, elapsedMs: 5, type: 'page_open', scene: 'page', phase: 'loading', detail: {} }] };
  assert.equal((await post(batch, 'https://unrelated.example')).status, 403, 'cross-origin accepted');
  assert.equal((await post({ ...batch, session: '../../outside' })).status, 400);
  const response = await post(batch), first = await response.json();
  assert.equal(response.status, 200, JSON.stringify(first)); assert.equal(first.copies, 2);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
  const a = path.join(privateRoot, 'primary/logs', batch.session, batch.id + '.json');
  const b = path.join(privateRoot, 'mirror/logs', batch.session, batch.id + '.json');
  assert.equal(await fs.readFile(a, 'utf8'), await fs.readFile(b, 'utf8'));
  assert.equal((await (await post(batch)).json()).sha256, first.sha256, 'duplicate changed content');
  await fs.unlink(b);
  assert.equal((await (await post(batch)).json()).copies, 2);
  assert.equal(await fs.readFile(a, 'utf8'), await fs.readFile(b, 'utf8'));
  assert.equal((await post({ ...batch, events: [{ ...batch.events[0], detail: { action: 'changed' } }] })).status, 409);
  const failed = { ...batch, id: crypto.randomUUID(), session: crypto.randomUUID() };
  const obstruction = path.join(privateRoot, 'mirror/logs', failed.session);
  await fs.writeFile(obstruction, 'synthetic mirror failure');
  assert.equal((await post(failed)).status, 503, 'partial copy received success');
  assert.ok(await fs.stat(path.join(privateRoot, 'primary/logs', failed.session, failed.id + '.json')));
  await fs.unlink(obstruction);
  assert.equal((await (await post(failed)).json()).copies, 2, 'partial write was not repaired');
  const ownerToken = 'b'.repeat(64);
  const portableJson = '{"format":"understar-save","formatVersion":1,"slotId":1,"payloadChecksum":"test","saveData":{"version":15,"world":{},"resources":{},"number":1e-7}}';
  const backup = { schema: 1, kind: 'save', id: crypto.randomUUID(), player: batch.player,
    createdAt: Date.now(), slot: 1, ownerToken, portableJson };
  const stored = await (await post(backup)).json(); assert.equal(stored.copies, 2, JSON.stringify(stored));
  const read = await (await post({ kind: 'backup_read', ownerToken, slot: 1, backupId: backup.id })).json();
  assert.equal(read.portableJson, portableJson);
  assert.equal((await post({ kind: 'backup_read', ownerToken: 'c'.repeat(64), slot: 1, backupId: backup.id })).status, 404);
  assert.equal((await fetch(origin + '/private/config.php')).status, 404);
  const summary = JSON.parse(execFileSync(php, [path.join(root, 'tools/2026-09-07-player-session-report.php'), '--config=' + configFile], { windowsHide: true }));
  assert.equal(summary.copyMismatches, 0); assert.equal(summary.sessions.length, 2);
  const maintenance = JSON.parse(execFileSync(php, [path.join(root, 'tools/2026-09-07-player-data-maintenance.php'), '--config=' + configFile], { windowsHide: true }));
  assert.equal(maintenance.apply, false); assert.equal(maintenance.expiredFiles, 0);
  assert.equal(maintenance.copies.primary.files, 3); assert.equal(maintenance.copies.mirror.files, 3);
  const report = { status: 'passed', origin, primary: path.join(privateRoot, 'primary'),
    mirror: path.join(privateRoot, 'mirror'), checks: ['same-origin', 'two copies', 'idempotency',
      'missing-copy repair', 'partial-write rejection and repair', 'owner isolation', 'exact save bytes', 'private config', 'CLI report and retention dry-run'] };
  await fs.writeFile(path.join(base, 'report.json'), JSON.stringify(report, null, 2));
  console.log('PLAYER_DATA_HTTP_CONTRACT_OK ' + path.join(base, 'report.json'));
} finally { server.kill(); }
