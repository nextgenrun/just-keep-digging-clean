import { COMPLEX_DIG_ANIMATIONS } from "./complexDigAnimations.js";

const entries = Object.entries(COMPLEX_DIG_ANIMATIONS.clips);
const propertyStem = (name) => `complexDig${name[0].toUpperCase()}${name.slice(1)}`;

const profileProperties = Object.fromEntries(entries.flatMap(([name, spec]) => {
  const stem = propertyStem(name);
  return [
    [`${stem}Sheet`, spec.sheetKey],
    [`${stem}Frames`, spec.frames],
  ];
}));

const animationKeys = Object.freeze(entries.map(([, spec]) => spec.animationKey));
const keysFor = (sequence) => Object.freeze(
  sequence.map((name) => COMPLEX_DIG_ANIMATIONS.clips[name].animationKey),
);

export const SURVIVAL_COMPLEX_DIG_PROFILE = Object.freeze({
  profileProperties: Object.freeze({
    ...profileProperties,
    complexDigAnimationKeys: animationKeys,
    complexDigSideAnimationKeys: keysFor(COMPLEX_DIG_ANIMATIONS.sideSequence),
    complexDigUpAnimationKeys: keysFor(COMPLEX_DIG_ANIMATIONS.upSequence),
    complexDigSourceFacesRight: COMPLEX_DIG_ANIMATIONS.sourceFacesRight,
  }),
  sheetFiles: Object.freeze(entries.map(([name, spec]) => Object.freeze([
    `${propertyStem(name)}Sheet`,
    spec.fileName,
    `${propertyStem(name)}Frames`,
    COMPLEX_DIG_ANIMATIONS.basePath,
  ]))),
  requiredSheets: Object.freeze(entries.map(([, spec]) => spec.sheetKey)),
  animations: Object.freeze(entries.map(([, spec]) => Object.freeze({
    key: spec.animationKey,
    sheet: spec.sheetKey,
    frames: spec.frames,
    frameRate: spec.frameRate,
    repeat: 0,
  }))),
  animationKeys,
  contactByAnimation: Object.freeze(Object.fromEntries(
    entries.map(([, spec]) => [spec.animationKey, spec.contact]),
  )),
  clearanceByAnimation: Object.freeze(Object.fromEntries(
    entries.map(([, spec]) => [spec.animationKey, spec.clearance]),
  )),
  displaySizeByAnimation: Object.freeze(Object.fromEntries(
    entries.map(([, spec]) => [spec.animationKey, COMPLEX_DIG_ANIMATIONS.displaySizePx]),
  )),
  originBySheet: Object.freeze(Object.fromEntries(
    entries.map(([, spec]) => [spec.sheetKey, spec.origin]),
  )),
  sourceClips: Object.freeze(Object.fromEntries(
    entries.map(([name, spec]) => [`complexDig${name[0].toUpperCase()}${name.slice(1)}`, spec.contact.sourceAction]),
  )),
});
