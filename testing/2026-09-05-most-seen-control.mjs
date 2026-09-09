import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const output = path.resolve('visual-approval-previews/2026-09-05-most-seen-visuals');
const session = JSON.parse(await fs.readFile(path.join(output, 'session.json'), 'utf8'));
const browser = await chromium.connectOverCDP('http://127.0.0.1:9337');
const page = browser.contexts()[0].pages()[0];
try {
  const { run } = await import('./2026-09-05-most-seen-step.mjs');
  await run(page, output, fs);
  process.exit(0);
} catch (error) { console.error(error); process.exit(1); }

