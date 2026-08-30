import { STAR_SANCTUARY_CONFIG } from "../../values/starSanctuary.js";
import { getStarIdentity } from "../../values/starIdentityLibraryMath.js";

const clamp = (value, minimum, maximum) => (
  Math.max(minimum, Math.min(maximum, value))
);
const lerp = (minimum, maximum, ratio) => (
  minimum + (maximum - minimum) * ratio
);

function mix32(value) {
  let mixed = value >>> 0;
  mixed ^= mixed >>> 16;
  mixed = Math.imul(mixed, 0x7feb352d);
  mixed ^= mixed >>> 15;
  mixed = Math.imul(mixed, 0x846ca68b);
  mixed ^= mixed >>> 16;
  return mixed >>> 0;
}

export function getStarSanctuarySiteSeed(tx, ty, identityIndex = 0) {
  return mix32(
    Math.imul((Math.floor(Number(tx) || 0) + 0x7fff) >>> 0, 0x1f123bb5)
      ^ Math.imul((Math.floor(Number(ty) || 0) + 0x7fff) >>> 0, 0x5f356495)
      ^ Math.imul((Math.floor(Number(identityIndex) || 0) + 1) >>> 0, 0x27d4eb2d),
  );
}

function seededUnit(seed, salt) {
  return mix32(seed ^ Math.imul(salt, 0x9e3779b1)) / 0xffffffff;
}

function rarityValue(values, rarityIndex) {
  const index = clamp(
    Math.floor(Number(rarityIndex) || 0),
    0,
    values.length - 1,
  );
  return values[index];
}

export function resolveStarSanctuaryProfile({
  tx = 0,
  ty = 0,
  identityIndex = 0,
  rarityIndex = 0,
} = {}, config = STAR_SANCTUARY_CONFIG) {
  const identity = getStarIdentity(identityIndex);
  const seed = getStarSanctuarySiteSeed(tx, ty, identity.index);
  const refuge = config.refuge;
  const temperament = config.temperaments[seed % config.temperaments.length];
  const gpRateVariation = lerp(
    refuge.gpRateVariation[0],
    refuge.gpRateVariation[1],
    seededUnit(seed, 1),
  );
  const gpCapVariation = lerp(
    refuge.gpCapVariation[0],
    refuge.gpCapVariation[1],
    seededUnit(seed, 2),
  );
  const radiusVariation = lerp(
    refuge.radiusVariation[0],
    refuge.radiusVariation[1],
    seededUnit(seed, 3),
  );
  const stressVariation = lerp(
    refuge.stressRecoveryVariation[0],
    refuge.stressRecoveryVariation[1],
    seededUnit(seed, 4),
  );
  const gpPerSecond = rarityValue(
    refuge.gpPerSecondByRarity,
    rarityIndex,
  ) * temperament.gpRateScale * gpRateVariation;
  const gpCapRatio = clamp(
    rarityValue(refuge.gpCapRatioByRarity, rarityIndex)
      + temperament.gpCapBonus
      + gpCapVariation,
    refuge.minimumGpCapRatio,
    refuge.maximumGpCapRatio,
  );
  const radiusTiles = clamp(
    refuge.baseRadiusTiles
      * (identity.light?.radiusScale || 1)
      * temperament.radiusScale
      * radiusVariation,
    0.5,
    refuge.maximumRadiusTiles,
  );
  const stressRecoveryScale = clamp(
    temperament.stressRecoveryScale * stressVariation,
    refuge.minimumStressRecoveryScale,
    refuge.maximumStressRecoveryScale,
  );

  return Object.freeze({
    id: `${identity.id}@${Math.floor(tx)},${Math.floor(ty)}`,
    key: `${Math.floor(tx)},${Math.floor(ty)}`,
    tx: Math.floor(tx),
    ty: Math.floor(ty),
    seed,
    identityIndex: identity.index,
    identityId: identity.id,
    identityName: identity.name,
    identityPrimary: identity.primary,
    identitySecondary: identity.secondary,
    rarityIndex: clamp(
      Math.floor(Number(rarityIndex) || 0),
      0,
      refuge.gpPerSecondByRarity.length - 1,
    ),
    temperamentId: temperament.id,
    temperamentLabel: temperament.label,
    temperamentDescription: temperament.description,
    gpPerSecond,
    gpCapRatio,
    radiusTiles,
    stressRecoveryScale,
  });
}
