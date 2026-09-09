import { HUD_LAYOUT } from "./hudLayout.js";

const DISABLED_VALUES = Object.freeze(["0", "false", "off", "legacy"]);

export const PLAYER_CONTACT_SHADOW_CONFIG = Object.freeze({
  enabled: true,
  depth: HUD_LAYOUT.playerDepth - 3,
  color: 0x03060a,
  outerWidthPx: 48,
  outerHeightPx: 13,
  outerAlpha: 0.1,
  enabledByDefault: true,
  rollbackQuery: "contactShadow",
  disabledValues: DISABLED_VALUES,
  innerWidthPx: 32,
  innerHeightPx: 8,
  innerAlpha: 0.16,
  groundedOffsetYPx: -2,
  speedReferencePxPerSecond: 280,
  maxHorizontalStretch: 0.18,
  maxVerticalCompression: 0.12,
  responsePerMs: 0.014,
  hiddenAlphaThreshold: 0.004,
});

export function resolvePlayerContactShadowEnabled(
  search = globalThis.window?.location?.search || "",
  config = PLAYER_CONTACT_SHADOW_CONFIG,
) {
  if (config.enabled !== true || config.enabledByDefault !== true) return false;
  const value = new URLSearchParams(search)
    .get(config.rollbackQuery)
    ?.trim()
    .toLowerCase();
  return !config.disabledValues.includes(value);
}
