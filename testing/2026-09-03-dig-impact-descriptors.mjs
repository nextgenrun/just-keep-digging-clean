/** Export original authored playback-frame addresses for the source-pixel audit. */
import { DIG_IMPACT_FX_CONFIG } from "../values/digImpactFx.js";
globalThis.location = { search: `?${DIG_IMPACT_FX_CONFIG.queryParam}=0` };
const { SURVIVAL_UAL_PLAYER_ASSET_PROFILE: profile } = await import("../values/survivalUalPlayerAssetProfile.js");
const { resolveUalActionContact } = await import("../values/ualNativeActionTuning.js");
const { MOVING_COMPLEX_DIG_ANIMATION_UNIFIED_V1: moving } = await import("../values/movingComplexDigAnimationUnifiedV1.js");
const variants = [...profile.digAnimationVariants, {
  key: profile.digDownAnim, sheet: profile.digDownSheet, frames: profile.digDownFrames,
}];
const output = [{
  sheet: profile.punchJabSheet, source: "punch-jab",
  frames: Array.from({ length: 27 }, (_, i) => i), contacts: [7],
}];
for (const variant of variants) {
  const contact = profile.actionContactByAnimation[variant.key]
    || (variant.key === profile.digDownAnim ? resolveUalActionContact(profile, variant.key) : null);
  if (!contact) continue;
  const alias = moving.aliases.find(entry => entry.animationKey === variant.key);
  output.push({
    sheet: variant.sheet, source: contact.sourceAction, frames: variant.frames,
    name: alias?.clipId,
    contacts: (contact.contacts || [contact]).map(c => variant.frames[c.sequenceIndex] ?? c.textureFrame),
  });
}
console.log(JSON.stringify(output));
