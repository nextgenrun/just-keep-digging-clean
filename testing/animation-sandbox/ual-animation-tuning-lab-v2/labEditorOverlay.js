import { LAB_EDITOR_CONFIG } from "./labConfig.js";
import { boxHandles } from "./labStageGeometry.js";

const COLORS = Object.freeze({
  body: "#ff786f",
  contact: "#f6b75a",
  marker: "#80e4da",
  pose: "#9a8cff",
  fill: "#071015",
});

function drawHandle(context, point, color, radius = LAB_EDITOR_CONFIG.interaction.handleRadiusPx) {
  context.fillStyle = COLORS.fill;
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.beginPath();
  context.arc(point.x, point.y, radius, 0, Math.PI * 2);
  context.fill();
  context.stroke();
}

function drawBoxSelection(context, rect, color) {
  context.save();
  context.setLineDash([5, 4]);
  context.lineWidth = 2;
  context.strokeStyle = color;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  context.setLineDash([]);
  const handles = boxHandles(rect);
  Object.entries(handles).forEach(([name, point]) => drawHandle(context, point, color, name === "move" ? 5 : undefined));
  context.restore();
}

function normalizedBounds(bounds) {
  return {
    x: bounds.x,
    y: bounds.y,
    width: Math.max(0, bounds.right - bounds.x),
    height: Math.max(0, bounds.bottom - bounds.y),
  };
}

function drawPoseSelection(context, bounds) {
  const rect = normalizedBounds(bounds);
  context.save();
  context.setLineDash([5, 4]);
  context.strokeStyle = COLORS.pose;
  context.lineWidth = 2;
  context.strokeRect(rect.x, rect.y, rect.width, rect.height);
  context.restore();
}

export function drawEditorOverlay(context, state, interaction) {
  if (!interaction) return;
  context.save();
  if (state.editorTool === "body") drawBoxSelection(context, interaction.bodyRect, COLORS.body);
  if (state.editorTool === "contact" && interaction.contactRect) drawBoxSelection(context, interaction.contactRect, COLORS.contact);
  if (state.editorTool === "hand") {
    const selected = interaction.markers[state.selectedMarker];
    if (selected) {
      drawHandle(context, selected, COLORS.marker, LAB_EDITOR_CONFIG.interaction.markerRadiusPx);
      context.strokeStyle = COLORS.marker;
      context.beginPath();
      context.moveTo(selected.x - 14, selected.y); context.lineTo(selected.x + 14, selected.y);
      context.moveTo(selected.x, selected.y - 14); context.lineTo(selected.x, selected.y + 14);
      context.stroke();
    }
  }
  if (state.editorTool === "pose") {
    drawPoseSelection(context, interaction.spriteBounds);
    drawHandle(context, { x: interaction.geometry.anchorX, y: interaction.geometry.anchorY }, COLORS.pose, LAB_EDITOR_CONFIG.interaction.markerRadiusPx);
  }
  context.restore();
}
