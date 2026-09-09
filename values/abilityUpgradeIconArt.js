const ROOT = "sprites/UI/ability-upgrade-icons-v1";
const icon = (slug, fallback) => Object.freeze({
  key: `ui-ability-upgrade-${slug}-v1`,
  path: `${ROOT}/${slug}-v1.png`,
  fallback,
});

const approved = (slug, fallback) => Object.freeze({
  key: `ui-approved-polish-${slug}`,
  path: `sprites/UI/approved-polish-2026-09-09/${slug}.png`, fallback,
});

/** Approved distinct ability and upgrade identities. */
export const ABILITY_UPGRADE_ICON_ART = Object.freeze({
  gemPowerUnlock: approved("gp-unlock", "gem"),
  gemPowerTank: approved("gp-tank", "gem"),
  gemPowerEfficiency: approved("gp-efficiency", "power"),
  gemPowerRegeneration: approved("gp-regeneration", "power"),
  torchRange: approved("torch-range", "torch"),
  torchDrainEfficiency: approved("torch-efficiency", "torch"),
  strength: approved("strength", "strength"),
  heavyPunch: approved("heavy-punch", "strength"),
  agility: approved("agility", "speed"),
  quickReflexes: approved("quick-reflexes", "speed"),
  boboCaveEyes: approved("cave-eyes", "bobo"),
  boboWisdom: approved("wisdom", "info"),
  quickslashAbility: icon("quickslash", "speed"),
  thunderStrikeAbility: icon("thunder-strike", "power"),
  gemFlySpeed: icon("flight", "speed"),
});
