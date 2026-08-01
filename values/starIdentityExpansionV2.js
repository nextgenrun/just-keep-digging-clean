// ==================== STAR IDENTITY EXPANSION V2 ====================
// Exact metadata and source-page plan for 200 additive authored Star identities.

const HUE_FAMILIES = Object.freeze([
  ["crimson", "Crimson", 350],
  ["vermilion", "Vermilion", 12],
  ["tangerine", "Tangerine", 28],
  ["amber", "Amber", 44],
  ["citrine", "Citrine", 58],
  ["chartreuse", "Chartreuse", 78],
  ["lime", "Lime", 96],
  ["jade", "Jade", 135],
  ["emerald", "Emerald", 150],
  ["mint", "Mint", 165],
  ["teal", "Teal", 178],
  ["aqua", "Aqua", 190],
  ["cyan", "Cyan", 200],
  ["azure", "Azure", 215],
  ["sapphire", "Sapphire", 230],
  ["indigo", "Indigo", 250],
  ["violet", "Violet", 270],
  ["amethyst", "Amethyst", 288],
  ["magenta", "Magenta", 310],
  ["rose", "Rose", 332],
]);

const TONE_MODIFIERS = Object.freeze([
  ["whispered", "Whispered", -4, 62, 72],
  ["frosted", "Frosted", 3, 70, 68],
  ["silken", "Silken", -2, 74, 64],
  ["vivid", "Vivid", 1, 88, 58],
  ["deep", "Deep", -5, 80, 48],
  ["smoked", "Smoked", 5, 58, 48],
  ["luminous", "Luminous", -1, 90, 62],
  ["radiant", "Radiant", 4, 94, 58],
  ["celestial", "Celestial", -3, 86, 66],
  ["prismatic", "Prismatic", 2, 96, 68],
]);

const effect = (id, noun, style, flavour) => Object.freeze({
  id,
  noun,
  style,
  flavour,
});

const EFFECTS_BY_RARITY = Object.freeze([
  Object.freeze([
    effect("halo", "Halo", "measured halo", "A quiet halo of {colour} light settles around a patient crystal heart."),
    effect("mist", "Mist", "breathing mist", "Fine {colour} mist curls outward, then gathers without touching the stone."),
    effect("drift", "Drift", "slow mote drift", "Small {colour} motes drift as though the mine has learned to breathe."),
    effect("bloom", "Bloom", "petal bloom", "Soft petals of {colour} light open once and remain perfectly still."),
    effect("rain", "Rain", "falling light rain", "Threads of {colour} light fall forever and vanish before reaching the floor."),
    effect("orbit", "Orbit", "calm spark orbit", "A calm orbit of {colour} sparks circles the crystal at walking pace."),
    effect("fan", "Fan", "feathered ray fan", "Feathered {colour} rays spread gently into the surrounding dark."),
    effect("chime", "Chime", "glass chime arcs", "Thin {colour} arcs hang like silent chimes beneath a winter sky."),
    effect("veil", "Veil", "folded light veil", "A folded veil of {colour} light shields the star without hiding it."),
    effect("motes", "Motes", "listening mote cloud", "Tiny {colour} motes gather as if listening for roots below the stone."),
    effect("lens", "Lens", "clear lens shimmer", "A clear {colour} lens bends the mine into one delicate ring."),
    effect("shimmer", "Shimmer", "surface shimmer", "A restrained {colour} shimmer travels over each crystal facet."),
  ]),
  Object.freeze([
    effect("tide", "Tide", "tidal ribbons", "Ribbons of {colour} light advance and retreat like a hidden tide."),
    effect("pulse", "Pulse", "leaf-wave pulse", "Each {colour} pulse unfurls in layered waves before drawing inward."),
    effect("lantern", "Lantern", "suspended lanterns", "Small {colour} lanterns answer from an unseen ceiling and slowly dim."),
    effect("comet", "Comet", "forked comet tail", "A forked {colour} comet tail points toward a tunnel no map records."),
    effect("iris", "Iris", "electric iris", "An iris of {colour} energy blinks open around the faceted crystal."),
    effect("ribbon", "Ribbon", "braided ribbons", "Braided {colour} ribbons cross without tangling or losing their glow."),
    effect("wake", "Wake", "luminous wake", "The star leaves a stationary {colour} wake as if space moved around it."),
    effect("chorus", "Chorus", "harmonic chorus", "Several {colour} wavelets gather into a small and wordless chorus."),
    effect("current", "Current", "crossing currents", "Two {colour} currents pass through one another without breaking form."),
    effect("petals", "Petals", "returning petals", "Broken {colour} petals keep returning to an imperfect luminous ring."),
  ]),
  Object.freeze([
    effect("crown", "Crown", "crown prominences", "Regal {colour} prominences rise into a crown too bright to wear."),
    effect("nova", "Nova", "faceted nova", "A faceted {colour} nova holds forever at the edge of its first breath."),
    effect("flare", "Flare", "long flare ribbons", "Long {colour} ribbons sweep outward like a solar flare frozen in time."),
    effect("prism", "Prism", "spectral prism", "The {colour} crystal fractures darkness into colours finer than dust."),
    effect("lightning", "Lightning", "branching lightning", "Branches of {colour} lightning crack once and remain suspended."),
    effect("choir", "Choir", "harmonic wave choir", "Layered {colour} waves gather around the star like a distant choir."),
    effect("sun", "Sun", "restrained corona", "A restrained {colour} corona gives the crystal the gravity of a small sun."),
    effect("diamond", "Diamond", "diamond shard halo", "Sharp {colour} shards remember an aurora trapped beneath ancient ice."),
    effect("cascade", "Cascade", "prismatic cascade", "A cascade of {colour} splinters descends, turns, and climbs again."),
    effect("arc", "Arc", "crossing solar arcs", "Two broad {colour} arcs cross behind the star without casting shadow."),
  ]),
  Object.freeze([
    effect("inferno", "Inferno", "coiling inferno", "Coiling {colour} fire plumes circle the star without consuming it."),
    effect("plasma", "Plasma", "fluid plasma", "Fluid {colour} plasma folds and unfolds as if the crystal were breathing."),
    effect("void", "Void", "void-lens rays", "A dark lens opens inside the {colour} light and quietly stares back."),
    effect("tempest", "Tempest", "silent tempest", "A compact {colour} tempest rolls around the crystal in total silence."),
    effect("eclipse", "Eclipse", "eclipse corona", "A hard {colour} corona outlines an eclipse that should not fit here."),
    effect("rupture", "Rupture", "fractured ray rupture", "Fractured {colour} rays tear outward, stop, and knit themselves whole."),
    effect("vortex", "Vortex", "double vortex", "Twin {colour} vortices turn in opposite directions around one still point."),
    effect("blaze", "Blaze", "liquid blaze arcs", "Liquid {colour} blaze arcs orbit a crystal heart that never cools."),
  ]),
  Object.freeze([
    effect("dragon", "Dragon", "serpentine dragonlight", "Serpentine {colour} light guards the star with the patience of old stone."),
    effect("phoenix", "Phoenix", "phoenix featherfire", "{colour} featherfire rises, falls, and rises again without becoming ash."),
    effect("oracle", "Oracle", "oracle eye rays", "An oracle eye of {colour} rays opens between several possible futures."),
    effect("leviathan", "Leviathan", "leviathan tendrils", "Vast {colour} tendrils reach from an ocean with no surface or shore."),
    effect("chronicle", "Chronicle", "time-echo chronicle", "Offset {colour} arcs show the star a heartbeat before and after now."),
    effect("revenant", "Revenant", "ancestral revenant flame", "Pale {colour} ancestral flames gather without forming a face."),
  ]),
  Object.freeze([
    effect("genesis", "Genesis", "primordial genesis", "Primordial {colour} light unfolds in four directions that space cannot hold."),
    effect("singularity", "Singularity", "gravitational lens", "The {colour} star calmly orbits the perfect absence at its own centre."),
    effect("horizon", "Horizon", "event-horizon aurora", "A full {colour} aurora bends across the rim of an impossible horizon."),
    effect("eternity", "Eternity", "eternal spectrum", "{colour} heavenfire carries colours that appear only while it moves."),
  ]),
]);

const RARITY_IDS = Object.freeze([
  "common",
  "uncommon",
  "rare",
  "epic",
  "mythic",
  "astral",
]);
const BASE_FRAME_COUNTS = Object.freeze([12, 10, 10, 8, 6, 4]);
const EXPANSION_COUNTS = Object.freeze([48, 40, 40, 32, 24, 16]);
const PAGE_COLUMNS = 4;
const PAGE_CAPACITY = 16;
const FRAME_SIZE_PX = 256;
const ATLAS_COLUMNS = 10;

function hslToHex(hue, saturation, lightness) {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const section = ((hue % 360) + 360) % 360 / 60;
  const x = chroma * (1 - Math.abs(section % 2 - 1));
  const rgb = section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
      : section < 3 ? [0, chroma, x]
        : section < 4 ? [0, x, chroma]
          : section < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const match = l - chroma / 2;
  return `#${rgb.map(value => Math.round((value + match) * 255)
    .toString(16).padStart(2, "0")).join("").toUpperCase()}`;
}

const expansionIdentities = [];
let expansionIndex = 0;
RARITY_IDS.forEach((rarityId, rarityIndex) => {
  const effects = EFFECTS_BY_RARITY[rarityIndex];
  for (let localIndex = 0; localIndex < EXPANSION_COUNTS[rarityIndex]; localIndex += 1) {
    const hueFamily = HUE_FAMILIES[expansionIndex % HUE_FAMILIES.length];
    const tone = TONE_MODIFIERS[Math.floor(expansionIndex / HUE_FAMILIES.length)];
    const phenomenon = effects[localIndex % effects.length];
    const hue = hueFamily[2] + tone[2];
    const colourName = `${tone[1]} ${hueFamily[1]}`;
    expansionIdentities.push(Object.freeze([
      `${tone[0]}-${hueFamily[0]}-${phenomenon.id}`,
      `${colourName} ${phenomenon.noun}`,
      rarityIndex,
      BASE_FRAME_COUNTS[rarityIndex] + localIndex,
      colourName,
      hslToHex(hue, tone[3], tone[4]),
      hslToHex(hue, Math.max(38, tone[3] - 18), Math.min(92, tone[4] + 20)),
      phenomenon.flavour.replace("{colour}", colourName.toLowerCase()),
      `${colourName.toLowerCase()} ${phenomenon.style}`,
    ]));
    expansionIndex += 1;
  }
});

const sourcePages = [];
let identityOffset = 0;
RARITY_IDS.forEach((rarityId, rarityIndex) => {
  const rarityIdentities = expansionIdentities.slice(
    identityOffset,
    identityOffset + EXPANSION_COUNTS[rarityIndex],
  );
  for (
    let pageOffset = 0, pageIndex = 0;
    pageOffset < rarityIdentities.length;
    pageOffset += PAGE_CAPACITY, pageIndex += 1
  ) {
    const identities = rarityIdentities.slice(pageOffset, pageOffset + PAGE_CAPACITY);
    sourcePages.push(Object.freeze({
      id: `${rarityId}-${String(pageIndex + 1).padStart(2, "0")}`,
      rarityId,
      rarityIndex,
      pageIndex,
      columns: PAGE_COLUMNS,
      rows: Math.ceil(identities.length / PAGE_COLUMNS),
      frameCount: identities.length,
      startFrame: BASE_FRAME_COUNTS[rarityIndex] + pageOffset,
      path: `sprites/environment/star-identities-v2/source/`
        + `star-identities-${rarityId}-expansion-page-`
        + `${String(pageIndex + 1).padStart(2, "0")}-source-v2.png`,
      identities: Object.freeze(identities),
    }));
  }
  identityOffset += EXPANSION_COUNTS[rarityIndex];
});

export const STAR_IDENTITY_EXPANSION_V2 = Object.freeze({
  schemaVersion: 2,
  packageId: "star-identities-v2",
  rarityIds: RARITY_IDS,
  baseFrameCounts: BASE_FRAME_COUNTS,
  expansionCounts: EXPANSION_COUNTS,
  totalRarityCounts: Object.freeze(
    BASE_FRAME_COUNTS.map((count, index) => count + EXPANSION_COUNTS[index]),
  ),
  frameSizePx: FRAME_SIZE_PX,
  atlasColumns: ATLAS_COLUMNS,
  sourcePageCapacity: PAGE_CAPACITY,
  rawIdentities: Object.freeze(expansionIdentities),
  sourcePages: Object.freeze(sourcePages),
});
