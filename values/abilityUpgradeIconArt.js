const ROOT = "sprites/UI/ability-upgrade-icons-v1";
const icon = (slug, fallback) => Object.freeze({
  key: `ui-ability-upgrade-${slug}-v1`,
  path: `${ROOT}/${slug}-v1.png`,
  fallback,
});

/** ImageGen artwork for the three distinct ability upgrade identities. */
export const ABILITY_UPGRADE_ICON_ART = Object.freeze({
  quickslashAbility: icon("quickslash", "speed"),
  thunderStrikeAbility: icon("thunder-strike", "power"),
  gemFlySpeed: icon("flight", "speed"),
});
