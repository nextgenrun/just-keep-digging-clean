import fs from "node:fs/promises";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url),{chromium}=require("C:/Users/Mila/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright");
const session=JSON.parse(await fs.readFile("visual-approval-previews/2026-09-06-hp-alignment-and-next-visuals/wired-session.json","utf8"));
const browser=await chromium.connect(session.endpoint),cdp=await browser.newBrowserCDPSession();
await cdp.send("Browser.close").catch(()=>{});
process.exit(0);
