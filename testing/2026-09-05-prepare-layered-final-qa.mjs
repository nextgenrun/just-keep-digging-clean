import fs from 'node:fs/promises';
const source=await fs.readFile('testing/2026-09-05-layered-world-review-smoke.mjs','utf8');
const more=await fs.readFile('testing/2026-09-05-layered-world-final-block.txt','utf8');
let script=source.slice(0,source.indexOf(' const captures=[];'))+more+source.slice(source.indexOf('\n} finally'));
script=script.replaceAll('8193','8194');
script=script.replace(" const page=await browser.newPage({viewport:{width:1536,height:1100}});"," const startedAt=Date.now();\n const page=await browser.newPage({viewport:{width:1536,height:1100},recordVideo:{dir:out,size:{width:1536,height:1100}}});");
await fs.writeFile('testing/2026-09-05-layered-world-final-qa.mjs',script);