import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { GAME_WIKI } from "../values/gameWiki.js";
import { LEVEL_ONE_BIOME_FIELD } from "../values/levelOneBiomeField.js";
import { DEPTH_MILESTONES } from "../values/depthMilestones.js";
import { RESOURCE_PRICES_CONFIG } from "../values/resourcePrices.js";
import { HudWikiShortcut } from "../systems/visual/HudWikiShortcut.js";
import { openGameWiki } from "../systems/visual/gameWikiLink.js";

const read = relative => readFile(new URL(`../${relative}`, import.meta.url), "utf8");
const [html, script, layout, components, responsive, sitemap, quickControls] = await Promise.all([
  read("game/undersstar-wiki/index.html"),
  read("game/undersstar-wiki/wiki.js"),
  read("game/undersstar-wiki/layout.css"),
  read("game/undersstar-wiki/components.css"),
  read("game/undersstar-wiki/responsive.css"),
  read("game/undersstar-wiki/sitemap.xml"),
  read("systems/visual/HudQuickControls.js"),
]);

assert.equal(GAME_WIKI.url, "https://www.nextgen.run/game/undersstar-wiki/");
assert.equal(GAME_WIKI.target, "_blank");
assert.match(GAME_WIKI.windowFeatures, /noopener/);
assert.match(GAME_WIKI.windowFeatures, /noreferrer/);

let directOpen = null;
assert.equal(openGameWiki((...args) => { directOpen = args; return null; }), true);
assert.deepEqual(directOpen, [GAME_WIKI.url, "_blank", "noopener,noreferrer"]);
assert.equal(openGameWiki(null), false);

function actor(overrides = {}) {
  const handlers = new Map();
  return {
    active: true,
    visible: true,
    width: 0,
    height: 0,
    displayWidth: 0,
    displayHeight: 0,
    input: { hitArea: { width: 0, height: 0, setTo(_x, _y, width, height) { this.width = width; this.height = height; } } },
    handlers,
    on(name, handler) { handlers.set(name, handler); return this; },
    setAlpha() { return this; },
    setDepth(value) { this.depth = value; return this; },
    setDisplaySize(width, height) { this.displayWidth = width; this.displayHeight = height; return this; },
    setFontSize() { return this; },
    setInteractive() { return this; },
    setOrigin() { return this; },
    setPosition(x, y) { this.x = x; this.y = y; return this; },
    setScale() { return this; },
    setScrollFactor() { return this; },
    setSize(width, height) { this.width = width; this.height = height; return this; },
    setVisible(value) { this.visible = value; return this; },
    removeAllListeners() { handlers.clear(); },
    destroy() { this.active = false; },
    ...overrides,
  };
}

const scene = {
  scale: { width: 320, height: 568 },
  textures: { exists: () => true },
  add: {
    container: () => actor({ children: [], add(children) { this.children.push(...children); return this; } }),
    zone: () => actor(),
    image: () => actor({ texture: { key: "ui-hud-approved-buff-chip" } }),
    text: (_x, _y, text) => actor({ text }),
  },
  tweens: { killTweensOf() {}, add() {} },
  soundSystem: { playUiSelect() { scene.soundPlayed = true; } },
};
const shortcut = new HudWikiShortcut(scene, {
  depth: 1970,
  anchorProvider: () => ({ x: 238, y: 420, height: 36 }),
});
shortcut.resize();
const health = shortcut.getHealthSnapshot();
assert.equal(health.active, true);
assert.equal(health.label, "WIKI");
assert.ok(health.width >= 116, "compact HUD keeps a legible approved-art chip");
assert.ok(health.height >= 32, "compact HUD keeps the shortcut visibly tall");
assert.ok(health.hitWidth >= 48 && health.hitHeight >= 48, "pointer target remains at least 48×48 px");

const previousOpen = globalThis.open;
let pointerOpen = null;
globalThis.open = (...args) => { pointerOpen = args; return null; };
try {
  let propagationStopped = false;
  shortcut.hit.handlers.get("pointerdown")?.(null, 0, 0, { stopPropagation() { propagationStopped = true; } });
  assert.deepEqual(pointerOpen, [GAME_WIKI.url, "_blank", "noopener,noreferrer"]);
  assert.equal(propagationStopped, true);
  assert.equal(scene.soundPlayed, true);
} finally {
  globalThis.open = previousOpen;
  shortcut.destroy();
}

assert.match(quickControls, /new HudWikiShortcut/);
assert.match(quickControls, /wikiShortcut\?\.resize/);
assert.match(quickControls, /wikiShortcut\?\.destroy/);
assert.match(html, /data-wiki-search/);
assert.match(html, /data-donation-form/);
assert.match(html, /<title>UNDERSTAR Wiki &amp; Beginner Guide \| 2D Mining Game<\/title>/);
assert.match(html, /name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1"/);
assert.match(html, /rel="canonical" href="https:\/\/www\.nextgen\.run\/game\/undersstar-wiki\/"/);
assert.match(html, /rel="sitemap" type="application\/xml" href="https:\/\/www\.nextgen\.run\/game\/undersstar-wiki\/sitemap\.xml"/);
assert.match(html, /"@type": "VideoGame"/);
assert.match(html, /"@type": "WebPage"/);
assert.match(html, /"@type": "BreadcrumbList"/);
assert.match(html, /How to play UNDERSTAR: your first expedition/);
assert.match(html, /UNDERSTAR controls and keybinds/);
assert.match(html, /Mining resources, ores and sale values/);
assert.match(html, /All Level One biomes/);
assert.match(html, /Depth milestones and progression/);
assert.match(html, /store\.steampowered\.com\/app\/4982520\/UNDERSTAR_Dig_Below_Rise_Above\//);
assert.ok((html.match(/store\.steampowered\.com\/app\/4982520/g) || []).length >= 6, "Steam is reachable from the header, hero, guide, FAQ, rail, and footer");
assert.match(html, /utm_source=nextgen_run/);
assert.match(html, /utm_medium=wiki/);
assert.match(html, /utm_campaign=understar_wishlist/);
assert.match(html, /utm_content=hero/);
assert.match(html, /class="hero-actions"><a class="button steam"[^>]+store\.steampowered\.com/);
assert.doesNotMatch(html.match(/<div class="hero-actions">[\s\S]*?<\/div>/)?.[0] || "", /support|donat/i, "donation must not compete with the primary Steam CTA");
assert.ok(html.indexOf('id="faq"') < html.indexOf('id="support"'), "optional donation remains after the player guide and FAQ");
assert.match(html, /id="support"[^>]+data-nosnippet/);
assert.match(html, /width="1920" height="620"[^>]+fetchpriority="high"/);
assert.match(html, /width="1920" height="1080"[^>]+loading="lazy"/);
assert.match(html, /layout\.css\?v=20260829-logo1/);
assert.match(layout, /\.hero-logo \{[^}]*height: auto;/, "responsive hero wordmark must preserve its 1200×330 aspect ratio");
assert.match(components, /\.button\.steam/);
assert.match(components, /\.steam-panel/);
assert.match(sitemap, /<loc>https:\/\/www\.nextgen\.run\/game\/undersstar-wiki\/<\/loc>/);
assert.match(sitemap, /<lastmod>2026-08-29<\/lastmod>/);
assert.equal((sitemap.match(/<image:loc>/g) || []).length, 2, "wiki sitemap exposes both approved search images");
assert.match(html, /Level One: 0–2,000m/);
assert.match(html, /current public beta/i);
assert.match(responsive, /@media \(max-width: 620px\)/);
assert.match(responsive, /\.steam-panel \{ grid-template-columns: 1fr; \}/);
assert.match(script, /payment_mode: "payment"/);
assert.match(script, /currency: "eur"/);
assert.match(script, /create-checkout-session\.php/);
assert.doesNotMatch(`${html}\n${script}`, /sk_(?:live|test)_/i, "the wiki must never contain a Stripe secret key");
assert.doesNotMatch(html, /name=["'](?:card|cvc|expiry)/i, "card data belongs only on hosted Stripe Checkout");

for (const profile of LEVEL_ONE_BIOME_FIELD.profiles) {
  assert.match(html, new RegExp(profile.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}
for (const key of ["dirt", "stone", "copper", "steel", "iron", "bronze", "silver", "gold"]) {
  assert.match(html, new RegExp(`>${RESOURCE_PRICES_CONFIG.basePrices[key]}<`));
}
for (const milestone of DEPTH_MILESTONES.filter(entry => entry.depth <= 2000)) {
  assert.match(html, new RegExp(milestone.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
}

for (const image of ["library-hero.webp", "understar-logo.webp", "gameplay-poster.webp", "understar-app-icon.png"]) {
  const imageStat = await stat(new URL(`../game/undersstar-wiki/assets/${image}`, import.meta.url));
  assert.ok(imageStat.size > 10000, `${image} must be a real approved image asset`);
}

console.log("UNDERSTAR wiki contract passed: Steam-first SEO, complete beta guide, approved HUD shortcut, responsive search, and optional hosted donation flow are guarded.");
