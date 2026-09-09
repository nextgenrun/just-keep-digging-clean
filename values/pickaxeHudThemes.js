export const PICKAXE_HUD_CONFIG = Object.freeze({
  enabled: true,
  rollbackQuery: Object.freeze({
    name: "pickaxeHud",
    disabledValue: "0",
  }),
  overlay: Object.freeze({
    x: 54,
    y: 60,
    size: 56,
    depthOffset: 4,
  }),
  label: Object.freeze({
    x: 257,
    y: 25,
    fontSize: 8,
    originX: 1,
    originY: 0,
    depthOffset: 5,
    strokeThickness: 1,
  }),
  fallbackLabel: "STARTER",
  purchasePulse: Object.freeze({
    startAlpha: 0.56,
    durationMs: 280,
    ease: "Sine.easeOut",
  }),
});

export const PICKAXE_HUD_THEMES = Object.freeze({
  bronzePickaxe: Object.freeze({
    id: "bronzePickaxe",
    label: "BRONZE I",
    tier: 1,
    accent: "#c47d42",
  }),
  ironPickaxe: Object.freeze({
    id: "ironPickaxe",
    label: "IRON II",
    tier: 2,
    accent: "#aeb8c1",
  }),
  steelPickaxe: Object.freeze({
    id: "steelPickaxe",
    label: "STEEL III",
    tier: 3,
    accent: "#d6e0e8",
  }),
  mithrilPickaxe: Object.freeze({
    id: "mithrilPickaxe",
    label: "MITHRIL IV",
    tier: 4,
    accent: "#63d7e8",
  }),
  adamantPickaxe: Object.freeze({
    id: "adamantPickaxe",
    label: "ADAMANT V",
    tier: 5,
    accent: "#45cf83",
  }),
  runePickaxe: Object.freeze({
    id: "runePickaxe",
    label: "RUNE VI",
    tier: 6,
    accent: "#a873ff",
  }),
  dragonPickaxe: Object.freeze({
    id: "dragonPickaxe",
    label: "DRAGON VII",
    tier: 7,
    accent: "#f07b38",
  }),
});

export function getPickaxeHudTheme(pickaxeId) {
  return PICKAXE_HUD_THEMES[String(pickaxeId || "")] || null;
}
