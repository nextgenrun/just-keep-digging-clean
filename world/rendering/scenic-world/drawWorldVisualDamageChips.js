import {
  hashWorldVisualDamageUnit,
  resolveWorldVisualDamageIntensity,
} from "./worldVisualDamageMath.js";

function fillChipTriangle(layer, x, y, radius, angle, color, alpha, cornerRadians) {
  layer.fillStyle(color, alpha).fillTriangle(
    x + Math.cos(angle) * radius,
    y + Math.sin(angle) * radius,
    x + Math.cos(angle + cornerRadians) * radius,
    y + Math.sin(angle + cornerRadians) * radius,
    x + Math.cos(angle - cornerRadians) * radius,
    y + Math.sin(angle - cornerRadians) * radius
  );
}

export function drawWorldVisualDamageChips(
  layers,
  tx,
  ty,
  size,
  stage,
  fracture,
  config
) {
  const chip = config.layers.chips;
  const salts = config.geometry.salts;
  const hash = config.hash;
  const rimAlpha = resolveWorldVisualDamageIntensity(
    chip.rimAlphaMin,
    chip.rimAlphaMax,
    stage.intensity
  );
  for (let index = 0; index < stage.chipCount; index += 1) {
    const pathPosition = hashWorldVisualDamageUnit(tx, ty, salts.chipPath + index, hash);
    const pathIndex = Math.min(
      fracture.primary.length - 1,
      Math.floor(pathPosition * fracture.primary.length)
    );
    const point = fracture.primary[pathIndex];
    const normalOffset = (
      hashWorldVisualDamageUnit(tx, ty, salts.chipNormal + index, hash) - 0.5
    ) * size * chip.normalSpreadScale;
    const radius = size * chip.radiusScale * (
      chip.randomSizeMin
      + hashWorldVisualDamageUnit(tx, ty, salts.chipSize + index, hash) * chip.randomSizeRange
    );
    const angle = hashWorldVisualDamageUnit(tx, ty, salts.chipAngle + index, hash) * Math.PI * 2;
    const x = point.x + fracture.normal.x * normalOffset;
    const y = point.y + fracture.normal.y * normalOffset;
    if (
      hashWorldVisualDamageUnit(tx, ty, salts.chipAngle + stage.chipCount + index, hash)
        < chip.triangleRatio
    ) {
      fillChipTriangle(
        layers.chips,
        x,
        y,
        radius,
        angle,
        chip.shadowColor,
        chip.shadowAlpha,
        chip.triangleCornerRadians
      );
    } else {
      layers.chips.fillStyle(chip.shadowColor, chip.shadowAlpha).fillCircle(x, y, radius);
    }
    layers.rim.fillStyle(chip.rimColor, rimAlpha).fillCircle(
      x - Math.cos(angle) * radius * chip.rimOffsetScale,
      y - Math.sin(angle) * radius * chip.rimOffsetScale,
      radius * chip.rimOffsetScale
    );
  }
}
