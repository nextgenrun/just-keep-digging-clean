// Review-only SSOT for the 2026-08-30 above-ground redesign runtime mockup.
// Every visible world element resolves to a checked-in production asset.

const freezeList = values => Object.freeze(values.map(value => Object.freeze(value)));

const hero = (assetId, x, groundY, distanceScale, alpha, tint = null, flipX = false) => ({
  kind: "hero",
  assetId,
  x,
  groundY,
  distanceScale,
  alpha,
  tint,
  flipX,
});

const prop = (assetId, x, groundY, scale = 1, alpha = 1, flipX = false) => ({
  kind: "prop",
  assetId,
  x,
  groundY,
  scale,
  alpha,
  flipX,
});

const chapter = (id, label, basePath, overlays) => Object.freeze({
  id,
  label,
  baseKey: `above-ground-current-${id}`,
  basePath,
  overlays: freezeList(overlays),
});

const CAPTURE_ROOT = "visual-approval-previews/surface-prop-worldbuilding-implementation-v2";

export const WORLD_VISUAL_ABOVE_GROUND_REDESIGN_REVIEW = Object.freeze({
  reviewOnly: true,
  productionChanged: false,
  version: "above-ground-existing-assets-runtime-review-v1-2026-08-30",
  title: "ABOVE-GROUND WORLD CONTINUITY REDESIGN",
  subtitle: "Current runtime capture + shipped V3 props + shipped V4 landmarks",
  assetPolicy: "checked-in-runtime-assets-only",
  designRule: "show-the-next-landmark-before-arrival-and-fill-only-the-ground-contact-band",
  width: 1536,
  height: 864,
  pixelsPerMeter: 40,
  backgroundColor: "#071323",
  defaultChapterId: "observatory",
  defaultMode: "redesign",
  distantTint: 0x7897b6,
  controls: Object.freeze({
    panelAlpha: 0.92,
    panelColor: 0x07111d,
    accentColor: "#e5b85c",
    textColor: "#f4ead5",
    mutedColor: "#9fb2c6",
    fontFamily: "Georgia, serif",
    titleSize: "20px",
    bodySize: "15px",
    leftX: 18,
    topY: 742,
    width: 1500,
    height: 104,
  }),
  chapters: freezeList([
    chapter(
      "town",
      "Town Square",
      "visual-approval-previews/2026-08-14-phaser-lighting-material-comparison-v2-latest-runtime/01-current-surface-town-new.png",
      [
        hero("arrivalForgeShelter", 1372, 443, 0.34, 0.42, 0x7897b6, true),
        prop("arrival-forge-ember-brazier", 1224, 449, 0.82, 0.94),
        prop("arrival-forge-smith-tool-rack", 1305, 449, 0.82, 0.94, true),
      ],
    ),
    chapter(
      "arrival-forge",
      "Arrival Forge",
      `${CAPTURE_ROOT}/2026-07-29-runtime-01-arrival-forge-camera-v3.png`,
      [
        hero("caravanWaystation", 1218, 433, 0.40, 0.48, 0x7897b6),
        hero("starwellPortalFrame", 1435, 433, 0.25, 0.24, 0x7897b6, true),
        prop("arrival-forge-smith-tool-rack", 565, 438, 0.94, 1, true),
        prop("arrival-forge-ember-brazier", 640, 438, 0.90, 1),
        prop("arrival-forge-smith-apron-stand", 703, 438, 0.92, 1),
      ],
    ),
    chapter(
      "starwell",
      "Starwell Herb Gardens",
      `${CAPTURE_ROOT}/2026-07-29-runtime-02-starwell-camera-v3.png`,
      [
        hero("starwellPortalFrame", 315, 436, 0.95, 0.98),
        hero("arrivalForgeShelter", 1030, 433, 0.30, 0.24, 0x7897b6, true),
        hero("timberwrightYard", 1348, 433, 0.37, 0.42, 0x7897b6),
        prop("starwell-herb-moonflower-trellis", 535, 439, 0.95, 1),
        prop("starwell-herb-blue-lantern-trio", 620, 439, 0.92, 1),
        prop("starwell-herb-celestial-rods", 703, 439, 0.94, 1, true),
      ],
    ),
    chapter(
      "observatory",
      "Observatory Ridge",
      `${CAPTURE_ROOT}/2026-07-29-runtime-03-observatory-camera-v3.png`,
      [
        hero("observatoryTelescope", 300, 436, 0.98, 1),
        hero("starwellPortalFrame", 1125, 433, 0.37, 0.34, 0x7897b6),
        hero("threeKingsOverlook", 1430, 433, 0.31, 0.28, 0x7897b6, true),
        prop("observatory-weather-vane", 560, 438, 1, 1),
        prop("observatory-star-dial", 654, 438, 1, 1),
        prop("observatory-anemometer", 742, 438, 1, 1, true),
        prop("observatory-signal-pennants", 895, 438, 0.92, 1),
      ],
    ),
    chapter(
      "frontier",
      "Frontier Survey Garden",
      `${CAPTURE_ROOT}/2026-07-29-runtime-04-frontier-camera-v3.png`,
      [
        hero("frontierSurveyPavilion", 325, 436, 1, 1),
        hero("observatoryTelescope", 1040, 433, 0.32, 0.26, 0x7897b6, true),
        hero("threeKingsOverlook", 1378, 433, 0.39, 0.40, 0x7897b6),
        prop("frontier-survey-young-sapling", 545, 438, 1, 1),
        prop("frontier-survey-survey-tripod", 650, 438, 0.98, 1),
        prop("frontier-survey-frontier-lantern", 742, 438, 1, 1),
        prop("frontier-survey-repair-tool-rack", 840, 438, 0.94, 1, true),
      ],
    ),
    chapter(
      "far-east",
      "Three Kings Overlook",
      `${CAPTURE_ROOT}/2026-07-29-runtime-05-far-east-camera-v3.png`,
      [
        hero("threeKingsOverlook", 1250, 436, 1, 1),
        hero("frontierSurveyPavilion", 180, 433, 0.40, 0.34, 0x7897b6, true),
        hero("observatoryTelescope", 510, 433, 0.27, 0.20, 0x7897b6),
        prop("far-east-survey-beacon", 720, 438, 1, 1),
        prop("far-east-signal-lantern", 820, 438, 1, 1),
        prop("far-east-belay-frame", 915, 438, 0.98, 1, true),
        prop("far-east-overlook-brazier", 1018, 438, 1, 1),
      ],
    ),
  ]),
});

export const WORLD_VISUAL_ABOVE_GROUND_REDESIGN_CHAPTER_BY_ID = Object.freeze(
  Object.fromEntries(
    WORLD_VISUAL_ABOVE_GROUND_REDESIGN_REVIEW.chapters.map(value => [value.id, value]),
  ),
);
