import { MINING_CONFIG } from "../../values/miningConfig.js";
import { TOWN_TUTORIAL_STAGES } from "../../values/retentionConfig.js";
import { TILE_TYPES } from "../../values/tileTypes.js";
import { prepareTownTutorialDigSite } from "./TownSquareTutorialDigSite.js";

export function resolveFirstUpgradePreview({
  scene,
  retention,
  enabled,
  search,
  upgradeId,
}) {
  const state = retention?.getTutorialState?.();
  const upgrades = scene.upgradeSystem;
  if (
    !enabled
    || state?.stage !== TOWN_TUTORIAL_STAGES.UPGRADE
    || !upgradeId
    || !upgrades?.getProjectedUpgradeEffects
  ) {
    return null;
  }
  const damageFor = effects => Math.max(
    1,
    Math.floor((MINING_CONFIG.baseDamage + (effects.digDamageAdditive || 0))
      * (1 + (effects.pickaxeDamage || 0))),
  );
  const beforeDamage = damageFor(upgrades.getUpgradeEffects());
  const afterDamage = damageFor(upgrades.getProjectedUpgradeEffects(upgradeId));
  const site = prepareTownTutorialDigSite(scene, search);
  const hp = site
    ? scene.worldModel?.getTileMaxHp?.(site.tx, site.ty, TILE_TYPES.DIRT)
    : null;
  return {
    beforeDamage,
    afterDamage,
    beforeHits: Number.isFinite(hp) ? Math.ceil(hp / beforeDamage) : 0,
    afterHits: Number.isFinite(hp) ? Math.ceil(hp / afterDamage) : 0,
  };
}
