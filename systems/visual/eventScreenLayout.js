// Keep event controls and notices at a stable screen size on the shared camera.
export function eventScreenPoint(scene, x, y) {
  const camera = scene.cameras?.main;
  const zoom = camera?.zoom || 1;
  const pivotX = (camera?.width || scene.scale.width) * (camera?.originX ?? 0.5);
  const pivotY = (camera?.height || scene.scale.height) * (camera?.originY ?? 0.5);
  return { x: pivotX + (x - pivotX) / zoom, y: pivotY + (y - pivotY) / zoom, scale: 1 / zoom };
}
export function placeEventOnScreen(scene, root, x, y) {
  const point = eventScreenPoint(scene, x, y);
  root.setScale?.(point.scale);
  root.setPosition(point.x, point.y);
}
