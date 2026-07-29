export function setTintIfChanged(target, tint) {
  if (!target?.setTint) return false;
  if (
    target.tintFill === false
    && target.tintTopLeft === tint
    && target.tintTopRight === tint
    && target.tintBottomLeft === tint
    && target.tintBottomRight === tint
  ) return false;
  target.setTint(tint);
  return true;
}

export function clearTintIfChanged(target) {
  if (!target?.clearTint || target.isTinted === false) return false;
  target.clearTint();
  return true;
}

export function setAlphaIfChanged(target, alpha) {
  if (!target?.setAlpha || target.alpha === alpha) return false;
  target.setAlpha(alpha);
  return true;
}

export function setPositionIfChanged(target, x, y) {
  if (!target?.setPosition || (target.x === x && target.y === y)) return false;
  target.setPosition(x, y);
  return true;
}

export function setDisplaySizeIfChanged(target, width, height) {
  if (
    !target?.setDisplaySize
    || (target.displayWidth === width && target.displayHeight === height)
  ) return false;
  target.setDisplaySize(width, height);
  return true;
}

export function setRotationIfChanged(target, rotation) {
  if (!target?.setRotation || target.rotation === rotation) return false;
  target.setRotation(rotation);
  return true;
}

export function setVisibleIfChanged(target, visible) {
  const resolved = Boolean(visible);
  if (!target?.setVisible || target.visible === resolved) return false;
  target.setVisible(resolved);
  return true;
}
