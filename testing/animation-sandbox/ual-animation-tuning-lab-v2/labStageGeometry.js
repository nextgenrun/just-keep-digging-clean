import { LAB_VIEW } from "./labConfig.js";
import { resolveMarker } from "./labEditorPatch.js";

export function directionForAim(aim) {
  return {
    x: aim.includes("LEFT") ? -1 : aim.includes("RIGHT") ? 1 : 0,
    y: aim.includes("UP") ? -1 : aim.includes("DOWN") ? 1 : 0,
  };
}

export function flipForSnapshot(snapshot, state) {
  let flip = state.facingLeft;
  if (state.scenarioId === "mining") flip = state.aim.includes("LEFT");
  if (state.scenarioId === "locomotion" && snapshot.segment.phase.startsWith("pivot")) flip = !flip;
  return flip;
}

export function resizeCanvas(canvas) {
  const width = Math.max(620, canvas.clientWidth || 620);
  const height = LAB_VIEW.canvasHeightPx;
  const ratio = Math.min(window.devicePixelRatio || 1, LAB_VIEW.maxDevicePixelRatio);
  const pixelWidth = Math.round(width * ratio);
  const pixelHeight = Math.round(height * ratio);
  if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
    canvas.width = pixelWidth;
    canvas.height = pixelHeight;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  return { context, width, height };
}

export function createFrameGeometry({ centerX, groundY, displaySize, profile, pose, flipX }) {
  return {
    centerX,
    groundY,
    anchorX: centerX + pose.offsetXPx * displaySize / profile.displaySizePx,
    anchorY: groundY + pose.offsetYPx * displaySize / profile.displaySizePx,
    displaySize,
    originX: profile.visualOriginX,
    originY: profile.visualOriginY,
    rotation: pose.rotationDeg * Math.PI / 180,
    scaleX: pose.scaleX,
    scaleY: pose.scaleY,
    flipX,
  };
}

export function transformLocalPoint(point, geometry) {
  const flip = geometry.flipX ? -1 : 1;
  const scaledX = point.x * geometry.scaleX * flip;
  const scaledY = point.y * geometry.scaleY;
  const cosine = Math.cos(geometry.rotation);
  const sine = Math.sin(geometry.rotation);
  return {
    x: geometry.anchorX + scaledX * cosine - scaledY * sine,
    y: geometry.anchorY + scaledX * sine + scaledY * cosine,
  };
}

export function inverseScreenDelta(delta, geometry, action) {
  const cosine = Math.cos(-geometry.rotation);
  const sine = Math.sin(-geometry.rotation);
  const rotatedX = delta.x * cosine - delta.y * sine;
  const rotatedY = delta.x * sine + delta.y * cosine;
  const localX = rotatedX / Math.max(0.01, geometry.scaleX) * (geometry.flipX ? -1 : 1);
  const localY = rotatedY / Math.max(0.01, geometry.scaleY);
  return {
    x: localX / geometry.displaySize * action.frame_width,
    y: localY / geometry.displaySize * action.frame_height,
  };
}

export function projectMarkers(frameMarkers, geometry, action, patch, context, bypass, resolutionScope = "effective") {
  if (!frameMarkers) return {};
  const projected = {};
  Object.entries(frameMarkers).forEach(([name, marker]) => {
    if (!Array.isArray(marker) || marker.length < 2) return;
    const correction = resolveMarker(patch, context, 0, name, bypass, resolutionScope);
    const point = {
      x: (marker[0] + correction.offsetXPx) / action.frame_width * geometry.displaySize - geometry.originX * geometry.displaySize,
      y: (marker[1] + correction.offsetYPx) / action.frame_height * geometry.displaySize - geometry.originY * geometry.displaySize,
    };
    projected[name] = transformLocalPoint(point, geometry);
  });
  return projected;
}

export function frameBounds(geometry) {
  const left = -geometry.originX * geometry.displaySize;
  const top = -geometry.originY * geometry.displaySize;
  const right = left + geometry.displaySize;
  const bottom = top + geometry.displaySize;
  const points = [
    transformLocalPoint({ x: left, y: top }, geometry),
    transformLocalPoint({ x: right, y: top }, geometry),
    transformLocalPoint({ x: right, y: bottom }, geometry),
    transformLocalPoint({ x: left, y: bottom }, geometry),
  ];
  return points.reduce((rect, point) => ({
    x: Math.min(rect.x, point.x),
    y: Math.min(rect.y, point.y),
    right: Math.max(rect.right, point.x),
    bottom: Math.max(rect.bottom, point.y),
  }), { x: Infinity, y: Infinity, right: -Infinity, bottom: -Infinity });
}

export function bodyRect(centerX, groundY, body, zoom) {
  return {
    x: centerX + body.offsetXPx * zoom - body.widthPx * zoom / 2,
    y: groundY + body.offsetYPx * zoom - body.heightPx * zoom,
    width: body.widthPx * zoom,
    height: body.heightPx * zoom,
  };
}

export function targetGeometry(centerX, groundY, state) {
  const tile = state.tileSize * state.zoom;
  const direction = directionForAim(state.aim);
  const playerLeft = centerX - tile / 2;
  const playerTop = groundY - tile;
  return {
    direction,
    tile,
    rect: {
      x: playerLeft + direction.x * tile,
      y: playerTop + direction.y * tile,
      width: tile,
      height: tile,
    },
  };
}

export function editableContactRect(base, marker, contact, direction, zoom) {
  const magnitude = Math.hypot(direction.x, direction.y) || 1;
  const forward = { x: direction.x / magnitude, y: direction.y / magnitude };
  const normal = { x: -forward.y, y: forward.x };
  const center = {
    x: marker.x + (forward.x * contact.forwardOffsetPx + normal.x * contact.normalOffsetPx) * zoom,
    y: marker.y + (forward.y * contact.forwardOffsetPx + normal.y * contact.normalOffsetPx) * zoom,
  };
  const width = base.width * contact.widthScale;
  const height = base.height * contact.heightScale;
  return { x: center.x - width / 2, y: center.y - height / 2, width, height, forward, normal };
}

export function boxHandles(rect) {
  const right = rect.x + rect.width;
  const bottom = rect.y + rect.height;
  const centerX = rect.x + rect.width / 2;
  const centerY = rect.y + rect.height / 2;
  return {
    nw: { x: rect.x, y: rect.y }, n: { x: centerX, y: rect.y }, ne: { x: right, y: rect.y },
    e: { x: right, y: centerY }, se: { x: right, y: bottom }, s: { x: centerX, y: bottom },
    sw: { x: rect.x, y: bottom }, w: { x: rect.x, y: centerY }, move: { x: centerX, y: centerY },
  };
}
