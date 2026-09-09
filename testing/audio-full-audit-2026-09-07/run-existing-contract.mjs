import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { basename, relative, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const name = process.argv[2];
if (!/^20[0-9-]+[a-z0-9-]+-contract\.mjs$/.test(name || '')) throw Error('Expected a dated contract filename');
const testing = fileURLToPath(new URL('../', import.meta.url));
const output = fileURLToPath(new URL('./prior-contract-reports/', import.meta.url));
fs.mkdirSync(output, {recursive:true});
const originalWrite = fs.writeFileSync;
fs.writeFileSync = (target, ...args) => {
  const path = target instanceof URL ? fileURLToPath(target) : resolve(String(target));
  const rel = relative(testing,path);
  const redirected = !rel.startsWith('..') && !isAbsolute(rel)
    ? resolve(output, name.replace('.mjs','')+'--'+basename(path)) : path;
  return originalWrite(redirected,...args);
};
syncBuiltinESMExports();
await import(new URL('../'+name, import.meta.url));
