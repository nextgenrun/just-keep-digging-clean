import {
  hashWorldVisualDamageUnit,
  resolveWorldVisualDamageIntensity,
} from "./worldVisualDamageMath.js";

function stroke(layer, points, width, color, alpha, minimumWidth) {
  layer.lineStyle(Math.max(minimumWidth, width), color, alpha).beginPath();
  layer.moveTo(points[0].x, points[0].y).lineTo(points[1].x, points[1].y).strokePath();
}

function drawScuffs(layer, tx, ty, size, stage, fracture, config) {
  const scuff = config.layers.scuff;
  const salts = config.geometry.salts;
  const hash = config.hash;
  const alpha = resolveWorldVisualDamageIntensity(scuff.alphaMin, scuff.alphaMax, stage.intensity);
  for (let index = 0; index < stage.scuffCount; index += 1) {
    const along = (hashWorldVisualDamageUnit(tx, ty, salts.scuffAlong + index, hash) - 0.5)
      * size * scuff.alongSpreadScale;
    const across = (hashWorldVisualDamageUnit(tx, ty, salts.scuffNormal + index, hash) - 0.5)
      * size * scuff.normalSpreadScale;
    const randomSize = scuff.randomSizeMin
      + hashWorldVisualDamageUnit(tx, ty, salts.scuffSize + index, hash) * scuff.randomSizeRange;
    const width = size * scuff.widthScale * randomSize
      * (0.5 + Math.abs(fracture.axis.x) * 0.5);
    const height = size * scuff.heightScale * randomSize
      * (0.5 + Math.abs(fracture.axis.y) * 0.5);
    layer.fillStyle(scuff.color, alpha).fillEllipse(
      fracture.center.x + fracture.axis.x * along + fracture.normal.x * across,
      fracture.center.y + fracture.axis.y * along + fracture.normal.y * across,
      width,
      height
    );
  }
}

function drawStressMarks(layers, tx, ty, size, stage, fracture, config) {
  const stress = config.layers.stress;
  const salts = config.geometry.salts;
  const hash = config.hash;
  const primaryAngle = Math.atan2(fracture.axis.y, fracture.axis.x);
  const shadowAlpha = resolveWorldVisualDamageIntensity(
    stress.shadowAlphaMin,
    stress.shadowAlphaMax,
    stage.intensity
  );
  const rimAlpha = resolveWorldVisualDamageIntensity(
    stress.rimAlphaMin,
    stress.rimAlphaMax,
    stage.intensity
  );
  for (let index = 0; index < stage.stressCount; index += 1) {
    const along = (hashWorldVisualDamageUnit(tx, ty, salts.stressAlong + index, hash) - 0.5)
      * size * stress.alongSpreadScale;
    const across = (hashWorldVisualDamageUnit(tx, ty, salts.stressNormal + index, hash) - 0.5)
      * size * stress.normalSpreadScale;
    const side = hashWorldVisualDamageUnit(tx, ty, salts.stressSide + index, hash) < 0.5 ? -1 : 1;
    const angle = primaryAngle + side * (
      stress.angleMinRadians
      + hashWorldVisualDamageUnit(tx, ty, salts.stressAngle + index, hash) * stress.angleRangeRadians
    );
    const length = size * stress.lengthScale * (
      stress.randomLengthMin
      + hashWorldVisualDamageUnit(tx, ty, salts.stressLength + index, hash)
        * stress.randomLengthRange
    );
    const centerX = fracture.center.x + fracture.axis.x * along + fracture.normal.x * across;
    const centerY = fracture.center.y + fracture.axis.y * along + fracture.normal.y * across;
    const halfX = Math.cos(angle) * length * 0.5;
    const halfY = Math.sin(angle) * length * 0.5;
    const points = [
      { x: centerX - halfX, y: centerY - halfY },
      { x: centerX + halfX, y: centerY + halfY },
    ];
    stroke(
      layers.shadow,
      points,
      size * stress.shadowWidthScale,
      stress.shadowColor,
      shadowAlpha,
      stress.minShadowWidthPx
    );
    const rimOffsetX = fracture.normal.x * size * stress.rimOffsetScale;
    const rimOffsetY = fracture.normal.y * size * stress.rimOffsetScale;
    stroke(
      layers.rim,
      points.map(point => ({ x: point.x + rimOffsetX, y: point.y + rimOffsetY })),
      size * stress.rimWidthScale,
      stress.rimColor,
      rimAlpha,
      stress.minRimWidthPx
    );
  }
}

export function drawWorldVisualDamageSurfaceWear(
  layers,
  tx,
  ty,
  size,
  stage,
  fracture,
  config
) {
  drawScuffs(layers.scuff, tx, ty, size, stage, fracture, config);
  drawStressMarks(layers, tx, ty, size, stage, fracture, config);
}
