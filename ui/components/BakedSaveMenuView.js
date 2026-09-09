import { BAKED_SAVE_MENU as ART } from "../../values/bakedSaveMenu.js";
import { SAVE_MENU_PRESENTATION } from "../../values/saveMenuPresentation.js";
import { UI_FONTS } from "../../values/uiLayout.js";
import { getHardcoreModeLabel, isHardcoreMode, isHardcoreModeArmed,
  isHardcoreModeExhausted, sanitizeHardcoreModeData } from "../../values/hardcoreMode.js";
import { fitLiveUiText, prepareArt } from "../../systems/visual/bakedUiArt.js";

const COPY = SAVE_MENU_PRESENTATION.copy;
const ASSETS = SAVE_MENU_PRESENTATION.baked;

function sourceFrame(scene, asset, id, rect) {
  return prepareArt(scene, { ...asset, frame: id, rect });
}

function clipFrame(scene, image, outline, x, y, scale) {
  const clip = scene.make.graphics({ x, y, add: false });
  clip.setScale(scale);
  const update = points => {
    clip.clear().fillStyle(0xffffff).beginPath();
    points.forEach(([px, py], index) => {
      const method = index ? "lineTo" : "moveTo";
      clip[method](px - image.width / 2, py - image.height / 2);
    });
    clip.closePath().fillPath();
  };
  update(outline);
  const mask = clip.createGeometryMask();
  image.setMask(mask);
  image.once("destroy", () => { mask.destroy(); clip.destroy(); });
  return update;
}

function numeric(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  if (String(Math.trunc(Math.abs(number))).length > ART.compactAfterDigits) {
    return new Intl.NumberFormat(ART.numberLocale, { notation: "compact", maximumFractionDigits: 1 }).format(number);
  }
  return number.toLocaleString(ART.numberLocale);
}

export function createBakedSaveSlot(scene, { x, y, width, height, slot }) {
  const kind = slot.hasData ? "occupied" : "empty";
  const frame = sourceFrame(scene, ASSETS.cards, kind, ART.cards[kind]);
  if (!frame) return null;
  sourceFrame(scene, ASSETS.cards, kind + "Selected", ART.cards[kind + "Selected"]);
  const root = scene.add.container(x, y).setName("baked-save-slot-" + slot.id);
  const image = scene.add.image(0, 0, frame.key, frame.frame);
  const scale = Math.min(width / image.width, height / image.height);
  image.setScale(scale);
  const updateClip = clipFrame(scene, image, ART.outlines[kind], x, y, scale);
  root.add(image);

  function value(id, text, color = ART.valueColor) {
    const well = ART.fields[id];
    const originX = well.align === "right" ? 1 : 0.5;
    const label = scene.add.text(
      (well.x - image.width / 2) * scale, (well.y - image.height / 2) * scale, String(text),
      { fontFamily: UI_FONTS.mono, fontSize: well.fontSize, fontStyle: "bold", color, align: "center" },
    ).setOrigin(originX, 0.5).setName("save-value-" + id);
    fitLiveUiText(label, well.width * scale, well.height * scale);
    label.setData("saveValueWell", { x: x + (well.x - image.width / 2 - (originX - 0.5) * well.width) * scale,
      y: y + (well.y - image.height / 2) * scale, width: well.width * scale, height: well.height * scale });
    root.add(label);
  }

  value("slot", slot.id);
  if (slot.hasData) {
    const mode = sanitizeHardcoreModeData(slot.hardcoreModeData);
    const hardcore = isHardcoreMode(mode);
    const ended = isHardcoreModeExhausted(mode);
    const status = ended ? COPY.runEnded : isHardcoreModeArmed(mode)
      ? mode.livesRemaining + " " + (mode.livesRemaining === 1 ? COPY.life : COPY.lives)
      : COPY.startsWithFlight;
    const modeText = hardcore ? getHardcoreModeLabel(mode).toUpperCase() + "\n" + status : COPY.casual;
    const date = slot.updatedAt ? new Date(slot.updatedAt) : null;
    value("date", date && Number.isFinite(date.getTime()) ? date.toLocaleDateString() : COPY.unknownDate);
    value("mode", modeText, ended ? ART.endedColor : hardcore ? ART.hardcoreColor : ART.casualColor);
    value("level", numeric(slot.level));
    value("depth", numeric(slot.currentDepth) + "m");
    value("best", numeric(slot.bestDepth) + "m");
    value("money", numeric(slot.wallet));
    value("stars", numeric(slot.stars));
    value("tiles", numeric(slot.dugTiles));
  }
  root.__saveMenuChrome = {
    baked: true,
    setState(state) {
      const nextFrame = kind + (state !== "idle" ? "Selected" : "");
      image.setFrame(nextFrame);
      updateClip(ART.outlines[nextFrame]);
    },
  };
  return root;
}

export function createBakedSaveCopy(scene, { x, y, id, width }) {
  const rect = ART.copyFrames[id];
  const frame = sourceFrame(scene, ASSETS.copy, id, rect);
  if (!frame) return null;
  const image = scene.add.image(x, y, frame.key, frame.frame).setName("baked-save-" + id);
  const scale = width / image.width;
  image.setScale(scale);
  image.updateBakedClip = clipFrame(scene, image, ART.outlines[id], x, y, scale);
  image.setData("bakedSaveCopy", true);
  return image;
}

export function setSaveMenuPrompt(scene, copy, color) {
  const image = scene._startPrompt;
  if (!image?.getData?.("bakedSaveCopy")) {
    image?.setText(copy).setColor(color);
    return;
  }
  const id = copy === COPY.selectedNew ? "new" : copy === COPY.selectedContinue ? "continue"
    : copy === COPY.endedPrompt ? "ended" : "choose";
  sourceFrame(scene, ASSETS.copy, id, ART.copyFrames[id]);
  image.setFrame(id);
  image.updateBakedClip(ART.outlines[id]);
}
