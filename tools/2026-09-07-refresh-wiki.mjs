import { readFile, writeFile } from "node:fs/promises";
import { PLAYER_HINTS } from "../values/playerHints.js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
const runtimeRoot = process.argv[2];
const runtimeModule = name => runtimeRoot ? pathToFileURL(resolve(runtimeRoot, "values", name)).href : new URL(`../values/${name}`, import.meta.url).href;
const { KEYBIND_ACTIONS } = await import(runtimeModule("keybindActions.js"));
const { resolveRandomEventFlags } = await import(runtimeModule("randomWorldEvents.js"));
const eventFlags = resolveRandomEventFlags("");
const availableHints = PLAYER_HINTS.filter(hint => !hint.requiresAction || KEYBIND_ACTIONS.some(action => action.id === hint.requiresAction));

const base = new URL("../game/undersstar-wiki/", import.meta.url);
const escape = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const keys = Object.fromEntries(KEYBIND_ACTIONS.map(action => [action.id, action.defaultKey]));
const keyCopy = copy => escape(copy).replace(/\{(\w+)\}/g, (_, key) => `<kbd>${escape(keys[key] || key)}</kbd>`);
let html = await readFile(new URL("index.html", base), "utf8");
function section(id, keywords, body) {
  const next = `<section class="wiki-section" id="${id}" data-search="${keywords}">\n${body}\n      </section>`;
  const expression = new RegExp(`<section class="wiki-section" id="${id}"[^>]*>[\\s\\S]*?<\\/section>`);
  if (!expression.test(html)) throw new Error(`Missing section: ${id}`);
  html = html.replace(expression, next);
}

html = html.replaceAll('"dateModified": "2026-08-29"', '"dateModified": "2026-09-07"')
  .replaceAll('20260829-seo1', '20260907-guide1').replaceAll('20260829-logo1', '20260907-guide1')
  .replace('Guide verified 29 August 2026.', 'Guide updated 7 September 2026.')
  .replace('<script src="wiki.js?v=20260907-guide1" defer></script>', '<script type="module" src="wiki.js?v=20260907-guide1"></script>')
  .replace('placeholder="Search wiki…" autocomplete="off" data-wiki-search', 'placeholder="Search controls, hints, upgrades…" autocomplete="off" maxlength="160" aria-label="Search the wiki" aria-controls="wiki-search-results" aria-expanded="false" data-wiki-search');
if (!html.includes('href="guide.css')) html = html.replace('</head>', '  <link rel="stylesheet" href="guide.css?v=20260907-guide1">\n</head>');
if (!html.includes('id="wiki-search-results"')) html = html.replace('</header>', `</header>
  <section id="wiki-search-results" class="search-results" aria-label="Wiki search results" data-search-results hidden>
    <div class="search-toolbar"><p role="status" aria-live="polite" data-search-status></p><button type="button" data-search-close aria-label="Clear and close search">Clear · Esc</button></div>
    <ol aria-label="Matching answers"></ol>
    <div data-search-empty hidden><h2>Try another word</h2><p>Search an action, resource, merchant, or the problem you are having. Spelling does not have to be perfect.</p><button type="button" data-search-query="Flight">Flight</button> <button type="button" data-search-query="save">Save backup</button> <button type="button" data-search-query="talent points">Talent Points</button></div>
    <p class="search-keyboard">↑ ↓ choose an answer · Enter opens it · Esc closes search</p>
  </section>`);
html = html.replace(/      <p class="sr-only" aria-live="polite" data-search-status>[\s\S]*?<\/div>\s*/, "");
html = html.replace('Dig, upgrade, survive and go deeper in a persistent mining adventure. Learn the current browser beta, then wishlist <strong>UNDERSTAR: Dig Below, Rise Above</strong> on Steam.',
  'Find the control, understand the upgrade, and get back to your run. Practical answers for the current <strong>UNDERSTAR</strong> browser beta.');
html = html.replace(/<ul class="hero-facts">[\s\S]*?<\/ul>/, '<ul class="hero-facts"><li>Level One · 0–2,000m</li><li>Updated 7 September 2026</li><li>16 practical hints</li></ul>');
if (!html.includes('class="guide-find"')) html = html.replace('<div class="hero-actions">', '<button class="guide-find" type="button" data-search-open><span>What do you need help with?</span><strong>Search the field guide</strong><small>Try “low GP”, “talent points”, or “save backup” · /</small></button><div class="hero-actions">');
if (!html.includes('class="guide-preview"')) html = html.replace('      </div>\n    </div>\n  </section>', '      </div>\n      <figure class="guide-preview"><a href="#visual-guide"><img src="assets/town-20260907.webp" width="1280" height="720" alt="Current UNDERSTAR town, miner and HUD" decoding="async"></a><figcaption>Inside the current game · explore the visual guide</figcaption></figure>\n    </div>\n  </section>');
if (!html.includes('href="#hints"')) html = html.replace('<li><a href="#controls">', '<li><a href="#hints">Hints &amp; quick answers</a></li><li><a href="#visual-guide">Visual guide</a></li><li><a href="#controls">');

section('quick-start', 'how play tutorial first expedition beginner opening movement dig flight portal sell upgrade resume', `
        <p class="eyebrow">Learn one useful loop</p><h2>How to play UNDERSTAR: your first expedition</h2>
        <p class="section-intro">Choose the guided start for a step-by-step first route. The objective strip tells you what to do next using your current key bindings.</p>
        <ol class="steps"><li><strong>Move.</strong> Walk through the marked opening route with A/D.</li><li><strong>Dig.</strong> Aim down with S and hold F at the starter seam. Hold the primary mouse button over an adjacent tile if you prefer mouse digging.</li><li><strong>Use Flight.</strong> Follow the opening prompt, then hold Shift in the air and steer with WASD. Space performs a separate fixed jump.</li><li><strong>Use the first portal.</strong> Continue through the opening shaft, approach the marked portal, and press E. Activate it before leaving the tutorial route.</li><li><strong>Sell.</strong> Return to the Money Monster and sell the resources you actually mined.</li><li><strong>Buy an upgrade.</strong> Pick an available shop upgrade and make the purchase.</li><li><strong>Resume.</strong> Use the learned return route and continue your descent with the improved build.</li></ol>
        <p>Skipping the guided start grants Flight access but skips its practice reserve. It does not give you sale cargo or a free shop purchase.</p>`);

section('celestial', 'celestial talent stars points tree level three wayward hollow sun stellar rage engines ability locked ranks relic titan level two arc core', `
        <p class="eyebrow">Three trees, two currencies</p><h2>Celestial systems</h2>
        <p class="section-intro">Open <strong>Esc → Stars</strong> or visit the Star Pillar. Celestial talent access begins at <strong>player level 3</strong>. These trees are part of the current game.</p>
        <div class="card-grid"><article class="card" data-search="tp spend unlock skill"><h3>Talent Points unlock nodes</h3><p>Player levels earn Talent Points. Spend them on new nodes, following the selected node’s prerequisites. A locked node explains what is missing.</p></article><article class="card" data-search="sp star rank improve upgrade"><h3>Stars improve owned talents</h3><p>Mining Star Blocks earns Star Points. Spend them to buy further ranks on talents you already own. The panel shows the next rank’s cost and effect; Stars do not replace the Talent Point needed to unlock a node.</p></article></div>
        <div class="card-grid"><article class="card"><h3>Wayward Star</h3><p>Launch a Star that ricochets through blocks. Its talents extend and change the route, speed, and return behavior.</p></article><article class="card"><h3>Hollow Sun</h3><p>A moving celestial power sends alternating pulse waves through nearby blocks. Its talents change the pulse and movement effects.</p></article><article class="card"><h3>Stellar Lance</h3><p>While active, your punches fire energy waves. A wave carries damage onward after breaking a block. Its talent ranks improve the lance, range, and follow-up effects.</p></article><article class="card"><h3>Activate an unlocked power</h3><p>Unlock its ability node, then use the Celestial action bar. Read its GP cost and cooldown before activating it; unlocking a power does not make its use free.</p></article></div>
        <figure class="poster"><a href="assets/talents-20260907.webp"><img src="assets/talents-20260907.webp" width="1280" height="720" alt="Current Esc Stars menu with the three Celestial talent trees" loading="lazy" decoding="async"></a><figcaption>The current Stars screen. Select a tree, then inspect a node and its cost.</figcaption></figure>
        <div class="notice warning"><strong>Outside this beta:</strong> Level Two, Arc Cores, Omega Arc Cores and Heavenblocks remain unavailable in the public demo. They are not requirements for Level One’s talent trees or Campfire.</div>`);

section('events', 'weather rain storm snow events crystal choir signal shadow miner graveborer wurm worm earthquake blackout bloom money monster rush', `
        <p class="eyebrow">Read the world around you</p><h2>Weather & events</h2>
        <p class="section-intro">Weather and underground encounters change the atmosphere and the decisions you make during a run. Follow the live event prompt and keep a route back to safety.</p>
        <div class="card-grid"><article class="card"><h3>Earthquakes</h3><p>Leave the marked falling-rock area before impact. Walk or fly clear, then dig the rubble after the fall.</p></article><article class="card"><h3>Graveborer Wurm</h3><p>Mining noise can attract a breach. Watch the warning line and leave its path before the Wurm arrives.</p></article><article class="card"><h3>Shadow Miner</h3><p>A shadowy miner can appear during underground exploration. Its activity belongs to the mine; keep watching your own route and GP while observing it.</p></article><article class="card"><h3>Crystal Choir & the Signal</h3><p>These encounters use their own prompts and objectives. Read the instructions at the discovery instead of treating every event as an ordinary ore deposit.</p></article></div>
        <p>Surface weather includes clear skies, drizzle, rain, storms, and snow. Shelter and depth affect how strongly the weather reaches you.</p>
        <div class="notice"><strong>Retired events:</strong> Blackout Bloom and Money Monster Rush are disabled. You do not need to search for them to progress.</div>`);

section('interface', 'HUD UI inventory codex resource star atlas rarity menu hints settings controls pause map GP depth', `
        <p class="eyebrow">Know where to look</p><h2>HUD & menus</h2>
        <div class="card-grid"><article class="card"><h3>Esc → Hints</h3><p>The field guide puts advice for your current situation first: active hazards, low GP, darkness, unspent Talent Points, and the opening objective. Browse all pages whenever you need a reminder. Read in Wiki opens the same hint in a separate tab.</p></article><article class="card"><h3>I → Holdings and Codex</h3><p>Holdings shows what you carry. Resource Codex explains materials; Special Blocks covers unusual finds and their effects. Star Codex appears when its progression unlocks, grouping Star identities by rarity with pages and detailed previews.</p></article><article class="card"><h3>Esc → Stars, Journey, Titans</h3><p>Stars contains talent trees. Journey connects progress and goals. Titans holds the discovery archive. Some information depends on what this run has unlocked or discovered.</p></article><article class="card"><h3>Esc → Settings and Saves</h3><p>Settings controls key bindings, audio, and presentation. Saves contains manual save, JSON export, and import. Esc closes the top overlay and returns control to the game.</p></article></div>
        <figure class="poster"><a href="assets/inventory-20260907.webp"><img src="assets/inventory-20260907.webp" width="1280" height="720" alt="Current inventory with Holdings, Resource Codex and Special Blocks tabs" loading="lazy" decoding="async"></a><figcaption>Use the in-game Codex when you want to identify what you have found.</figcaption></figure>`);

html = html.replace('These are base values before market and progression bonuses.', 'These are base values before market and progression bonuses; the shop displays your actual sale total.');
html = html.replace(/<div class="notice warning"><strong>Level Two materials:<\/strong>[\s\S]*?<\/div>/,
  '<div class="notice"><strong>Ember Ore is current:</strong> finding Ember adds Campfire charges and supports its refill progression. Resource Codex includes fourteen material entries; a catalog entry does not mean every material is available in the current Level One route. Lava Dirt, Obsidian and Magma Crystal belong to later content.</div>');
html = html.replace(/<div class="control"><kbd>Ctrl<\/kbd>[\s\S]*?<\/div>/g, "").replace(/<div class="control"><kbd>Mouse<\/kbd>[\s\S]*?<\/div>/g, "");
if (KEYBIND_ACTIONS.some(action => action.id === "run")) html = html.replace('<div class="control"><kbd>F</kbd>',  '<div class="control"><kbd>Ctrl</kbd><span>Hold while moving to run; consumes GP</span></div><div class="control"><kbd>Mouse</kbd><span>Hold primary click on an adjacent tile to dig</span></div><div class="control"><kbd>F</kbd>');
html = html.replace(/<p class="notice warning"><strong>Developer-only bindings:<\/strong>[\s\S]*?<\/p>/,
  '<p class="notice"><strong>Your keys may differ:</strong> change them in Esc → Settings. In-game Hints uses your current bindings. This table shows defaults; abilities must be unlocked before their keys work.</p>');
html = html.replace('Release Shift, Quickslash and the torch, land safely, and wait for regeneration.', 'Land in a safe, lit place and release Flight, running, and Quickslash. Lower torch intensity if needed; in Hardcore, keep light available to control stress while GP regenerates.');
html = html.replace('Stand next to a solid tile, aim with A/D/W/S and hold F.', 'Stand next to a solid tile, aim with A/D/W/S and hold F, or hold primary mouse click over an adjacent tile.');
html = html.replace(/Accelerates the mining rhythm to 2.5× speed, with a 180ms minimum cooldown, while consuming 12 GP per paid action./, 'Speeds up the mining rhythm while consuming GP per paid action. Buy the base ability from Bobo; your upgrades change its effective cost and behavior.');
html = html.replace('Costs 100 GP, reaches a base six-tile radius and deals strongest damage near its center with distance falloff.', 'Buy the base ability from Bobo, then use V for a powered area strike. Check the ability’s displayed GP cost and current upgrades before using it.');

const hints = `<section class="wiki-section" id="hints" data-search="hints help tips stuck advice guide">\n<p class="eyebrow">The same help as Esc → Hints</p><h2>Hints & quick answers</h2><p class="section-intro">In-game Hints sorts these topics for your current situation and displays your remapped keys. Here, use search or choose a topic; controls below are the defaults.</p><div class="hint-grid">\n${availableHints.map(hint => `<article class="hint-card" id="hint-${hint.id}" data-search="${escape(hint.keywords)}"><p class="meta">${escape(hint.category)}</p><h3>${escape(hint.title)}</h3><p>${keyCopy(hint.body)}</p><a href="#${hint.section}">Read the ${escape(hint.category.toLowerCase())} guide →</a></article>`).join('\n')}\n</div></section>`;
if (html.includes('id="hints"')) html = html.replace(/<section class="wiki-section" id="hints"[\s\S]*?<\/section>/, hints);
else html = html.replace('<section class="wiki-section" id="controls"', `${hints}\n\n      <section class="wiki-section" id="controls"`);
if (!html.includes('id="visual-guide"')) html = html.replace('<section class="wiki-section" id="hints"', `<section class="wiki-section" id="visual-guide" data-search="screenshots visuals town HUD hints talents inventory codex"><p class="eyebrow">Recognize it in your run</p><h2>Visual guide</h2><p class="section-intro">Screenshots from the current game, captured on 7 September 2026. Open an image to inspect the menu at full size.</p><div class="visual-grid"><figure><a href="assets/town-20260907.webp"><img src="assets/town-20260907.webp" width="1280" height="720" alt="Current town and HUD" loading="lazy"></a><figcaption>Town & HUD · your return point</figcaption></figure><figure><a href="assets/hints-20260907.webp"><img src="assets/hints-20260907.webp" width="1280" height="720" alt="Esc Hints with relevant advice and wiki links" loading="lazy"></a><figcaption>Esc → Hints · advice for this run</figcaption></figure><figure><a href="assets/talents-20260907.webp"><img src="assets/talents-20260907.webp" width="1280" height="720" alt="Celestial talent tree selector" loading="lazy"></a><figcaption>Esc → Stars · choose a talent tree</figcaption></figure><figure><a href="assets/inventory-20260907.webp"><img src="assets/inventory-20260907.webp" width="1280" height="720" alt="Inventory and Codex" loading="lazy"></a><figcaption>I → Inventory · inspect your discoveries</figcaption></figure></div></section>\n\n      <section class="wiki-section" id="hints"`);
html = html.replace(/<li>\d+ practical hints<\/li>/, `<li>${availableHints.length} practical hints</li>`);
if (!eventFlags.signal) html = html.replace('<h3>Crystal Choir & the Signal</h3>', '<h3>Crystal Choir</h3>');
if (eventFlags.blackoutBloom) html = html.replace('<strong>Retired events:</strong> Blackout Bloom and Money Monster Rush are disabled. You do not need to search for them to progress.', '<strong>Blackout Bloom:</strong> this event is active in the public build. Follow its light and harvest prompts. Money Monster Rush is disabled.');
if (!KEYBIND_ACTIONS.some(action => action.id === "run")) html = html.replace('release Flight, running, and Quickslash.', 'release Flight and Quickslash.');
if (!html.includes('<kbd>Mouse</kbd>')) html = html.replace('<div class="control"><kbd>F</kbd>', '<div class="control"><kbd>Mouse</kbd><span>Hold primary click on an adjacent tile to dig</span></div><div class="control"><kbd>F</kbd>');
html = html.replace(/src="assets\/gameplay-poster.webp" width="1920" height="1080" alt="Current UNDERSTAR[^"\n]*"/, 'src="assets/town-20260907.webp" width="1280" height="720" alt="Current UNDERSTAR town and HUD"');
html = html.replace('Current gameplay-demo presentation. UI and balance can change during beta.', 'Town and HUD in the current game. Screenshot captured 7 September 2026.');
await writeFile(new URL('index.html', base), html);
let script = await readFile(new URL('wiki.js', base), 'utf8');
if (!script.includes('initializeWikiSearch')) {
  script = 'import { initializeWikiSearch } from "./search-ui.js?v=20260907-guide1";\n' + script;
  script = script.replace(/const searchInput = [\s\S]*?const sections =/, 'const sections =');
  script = script.replace(/  const typing = [\s\S]*?  if \(event.key === "Escape"\)/, '  if (event.key === "Escape")');
  script = script.replace(/function normalizeSearch\([\s\S]*?searchInput\?\.addEventListener\("input", updateSearch\);\s*/, '');
  script = script.replace('updateSearch();', 'initializeWikiSearch();');
  await writeFile(new URL('wiki.js', base), script);
}
const sitemap = await readFile(new URL('sitemap.xml', base), 'utf8');
await writeFile(new URL('sitemap.xml', base), sitemap.replaceAll('2026-08-29', '2026-09-07'));
console.log(`Wiki refreshed from ${availableHints.length} shared hints and current key bindings.`);
