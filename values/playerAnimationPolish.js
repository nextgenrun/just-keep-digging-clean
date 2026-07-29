import { PLAYER_ANIMATION_POLISH } from "./playerAnimationPolish.generated.js";

export { PLAYER_ANIMATION_POLISH };

export function isPlayerAnimationPolishDisabled(
  search = globalThis.location?.search || "",
  config = PLAYER_ANIMATION_POLISH,
) {
  if (typeof search !== "string" || search.length === 0) return false;
  return new URLSearchParams(search).get(config.rollbackQuery) === config.disabledQueryValue;
}

export function isPlayerAnimationFeatureEnabled(
  feature,
  search = globalThis.location?.search || "",
  config = PLAYER_ANIMATION_POLISH,
) {
  if (
    config.enabledByDefault !== true
    || feature?.enabledByDefault !== true
    || isPlayerAnimationPolishDisabled(search, config)
  ) return false;
  return new URLSearchParams(search).get(feature.rollbackQuery) !== feature.disabledQueryValue;
}
