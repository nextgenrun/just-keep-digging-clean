import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { TITAN_DISCOVERY_CONFIG } from "../values/titanDiscoveries.js";
import { TITAN_DISCOVERY_EXPERIENCE } from "../values/titanDiscoveryExperience.js";
import { UI_NOTIFICATION_CAROUSEL_CONFIG } from "../values/uiNotificationCarousel.js";
import {
  createTitanGuidanceIndicatorLayout,
} from "../systems/visual/titanGuidanceIndicatorGeometry.js";
import { readRgbaPng } from "./titanCreatureFootprintFixture.mjs";

const indicator = TITAN_DISCOVERY_EXPERIENCE.guidance.indicator;
const viewport = { width: 1280, height: 720 };
const player = { x: 640, y: 360 };

const right = createTitanGuidanceIndicatorLayout(
  viewport,
  player,
  { x: 3200, y: 360 },
  indicator,
);
assert.equal(right.targetOnScreen, false);
assert.equal(right.edgeClamped, true);
assert.ok(right.pointer.x > 1200);
assert.equal("plate" in right, false);
assert.ok(Math.abs(right.angleRadians) < 0.001);

const below = createTitanGuidanceIndicatorLayout(
  viewport,
  player,
  { x: 640, y: 3200 },
  indicator,
);
assert.equal(below.targetOnScreen, false);
assert.ok(below.pointer.y < viewport.height - indicator.safeArea.bottomPx);
assert.ok(Math.abs(below.angleRadians - Math.PI / 2) < 0.001);

const above = createTitanGuidanceIndicatorLayout(
  viewport,
  player,
  { x: 640, y: -1200 },
  indicator,
);
assert.ok(
  above.pointer.y - indicator.pointerSizePx / 2 >= indicator.safeArea.topPx,
  "an upward Titan pointer must remain inside its persistent-HUD safe area",
);

const onScreenTarget = { x: 850, y: 430 };
const onScreen = createTitanGuidanceIndicatorLayout(
  viewport,
  player,
  onScreenTarget,
  indicator,
);
assert.equal(onScreen.targetOnScreen, true);
assert.ok(
  Math.abs(
    Math.hypot(
      onScreenTarget.x - onScreen.pointer.x,
      onScreenTarget.y - onScreen.pointer.y,
    ) - indicator.onScreenTargetGapPx,
  ) < 0.01,
);

assert.ok(indicator.depth < 1000);
assert.ok(indicator.depth < UI_NOTIFICATION_CAROUSEL_CONFIG.depth);
assert.ok(indicator.resonanceAlpha <= 0.72);
assert.ok(indicator.pointerPulseScale <= 0.02);

const pointer = readRgbaPng(new URL(
  "../sprites/UI/titan-guidance-v1/titan-resonance-pointer-v1.png",
  import.meta.url,
));
assert.equal(pointer.width, 256);
assert.equal(pointer.height, 256);
const alphaAt = (x, y) => pointer.rgba[(y * pointer.width + x) * 4 + 3];
assert.equal(alphaAt(0, 0), 0);
assert.equal(alphaAt(pointer.width - 1, 0), 0);
assert.equal(alphaAt(0, pointer.height - 1), 0);
assert.equal(alphaAt(pointer.width - 1, pointer.height - 1), 0);
let visiblePixels = 0;
for (let offset = 3; offset < pointer.rgba.length; offset += 4) {
  if (pointer.rgba[offset] > 24) visiblePixels += 1;
}
assert.ok(visiblePixels > 5000);
assert.ok(visiblePixels < pointer.width * pointer.height * 0.4);

const guidanceSource = readFileSync(
  new URL("../systems/visual/TitanDiscoveryGuidance.js", import.meta.url),
  "utf8",
);
const indicatorSource = readFileSync(
  new URL("../systems/visual/TitanGuidanceIndicator.js", import.meta.url),
  "utf8",
);
const bootSource = readFileSync(
  new URL("../ui/scenes/BootScene.js", import.meta.url),
  "utf8",
);
assert.doesNotMatch(guidanceSource, /uiNotifications\.info/);
assert.doesNotMatch(guidanceSource, /uiNotifications/);
assert.match(guidanceSource, /this\.indicator\.show/);
assert.match(indicatorSource, /assets\.guidancePointer\.key/);
assert.match(
  indicatorSource,
  /uiNotifications\?\.getSnapshot/,
  "the movable Titan pointer must yield while any draggable center card is visible",
);
assert.doesNotMatch(
  indicatorSource,
  /ASSET_KEYS|approvedHud|add\.text|this\.(frame|title|direction|status)/,
  "the in-world Titan locator must render only the approved arrow image",
);
assert.doesNotMatch(
  indicatorSource,
  /add\.(graphics|rectangle|circle|triangle)|fillTriangle|strokeTriangle/,
);
assert.match(bootSource, /getTitanDiscoveryPreloadAssets/);
assert.equal(
  TITAN_DISCOVERY_CONFIG.assets.guidancePointer.path,
  "sprites/UI/titan-guidance-v1/titan-resonance-pointer-v1.png",
);

console.log(
  "titan guidance indicator contract: arrow-only edge projection, on-location pointing, HUD-safe bounds, subtle art-backed presentation, and no tooltip text passed",
);
