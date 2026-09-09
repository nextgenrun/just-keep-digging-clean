import { DOWNWARD_DIG_ANIMATIONS } from "./downwardDigAnimations.js";

const entries = DOWNWARD_DIG_ANIMATIONS.sequence.map(
  name => [name, DOWNWARD_DIG_ANIMATIONS.clips[name]],
);
const propertyStem = (name) => (
  `downwardDig${name[0].toUpperCase()}${name.slice(1)}`
);
const animationKeys = Object.freeze(
  DOWNWARD_DIG_ANIMATIONS.sequence.map(
    name => DOWNWARD_DIG_ANIMATIONS.clips[name].animationKey,
  ),
);

const profileProperties = Object.fromEntries(entries.flatMap(([name, spec]) => {
  const stem = propertyStem(name);
  return [
    [`${stem}Sheet`, spec.sheetKey],
    [`${stem}Frames`, spec.frames],
  ];
}));

export const SURVIVAL_DOWNWARD_DIG_PROFILE = Object.freeze({
  profileProperties: Object.freeze({
    ...profileProperties,
    downwardDigAnimationKeys: animationKeys,
    downwardDigSourceFacesRight: DOWNWARD_DIG_ANIMATIONS.sourceFacesRight,
  }),
  sheetFiles: Object.freeze(entries.map(([name, spec]) => Object.freeze([
    `${propertyStem(name)}Sheet`,
    spec.fileName,
    `${propertyStem(name)}Frames`,
    DOWNWARD_DIG_ANIMATIONS.basePath,
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
  displaySizeByAnimation: Object.freeze(Object.fromEntries(
    entries.map(([, spec]) => [
      spec.animationKey,
      DOWNWARD_DIG_ANIMATIONS.displaySizePx,
    ]),
  )),
  originBySheet: Object.freeze(Object.fromEntries(
    entries.map(([, spec]) => [spec.sheetKey, spec.origin]),
  )),
  sourceClips: Object.freeze(Object.fromEntries(
    entries.map(([name, spec]) => [propertyStem(name), spec.contact.sourceAction]),
  )),
});
