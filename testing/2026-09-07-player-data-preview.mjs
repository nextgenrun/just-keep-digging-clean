import fs from 'node:fs/promises';
import path from 'node:path';
import net from 'node:net';
import { spawn, execFileSync } from 'node:child_process';
const root = process.cwd(), snapshot = path.resolve(root, process.argv[2] || 'dist-player-data-20260907-ready');
if (!snapshot.startsWith(root + path.sep)) throw new Error('Snapshot must be inside the workspace');
const base = path.join(root, 'testing/artifacts/player-data-2026-09-07/browser-preview');
await fs.mkdir(base, { recursive: true });
const port = await new Promise(resolve => { const probe = net.createServer(); probe.listen(0, '127.0.0.1', () => { const port = probe.address().port; probe.close(() => resolve(port)); }); });
const origin = 'http://127.0.0.1:' + port, privateRoot = path.join(base, 'private-' + port);
const config = path.join(privateRoot, 'config.php'), php = 'C:/xampp/php/php.exe';
execFileSync(php, [path.join(root, 'tools/2026-09-07-configure-player-data.php'), '--config=' + config,
  '--primary=' + path.join(privateRoot, 'primary'), '--mirror=' + path.join(privateRoot, 'mirror'),
  '--public-root=' + snapshot, '--origin=' + origin, '--local-test'], { windowsHide: true, stdio: 'pipe' });
const server = spawn(php, ['-S', '127.0.0.1:' + port, '-t', snapshot], {
  windowsHide: true, stdio: 'ignore', env: { ...process.env, UNDERSTAR_PLAYER_DATA_CONFIG: config },
});
const report = { origin, config, primary: path.join(privateRoot, 'primary'), mirror: path.join(privateRoot, 'mirror'), pid: server.pid, snapshot };
await fs.writeFile(path.join(base, 'preview.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ origin, pid: server.pid, report: path.join(base, 'preview.json') }));
process.on('SIGINT', () => { server.kill(); process.exit(0); });
process.on('SIGTERM', () => { server.kill(); process.exit(0); });
server.on('exit', code => process.exit(code || 0));

