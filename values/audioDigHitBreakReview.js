// Review-only presentation and measurement thresholds; never imported by gameplay.
export const DIG_AUDIO_REVIEW = Object.freeze({
 title: "Dig, hit and break audio", date: "2026-09-06",
 decisionStore: "understar-active-gametime-audio-reaudit-2026-09-04",
 noteStore: "understar-dig-hit-break-notes-2026-09-06",
 analysisWindowMs: 5, bodyThresholdRatio: 0.45,
 sampleRate: 48000, cycles: 12, captureGapMs: 2000,
 repeatCount: 5, repeatGapMs: 500, contactDelayMs: 110,
 attackWarningMs: 35, repeatedTailWarningMs: 400,
 sourceOrder: ["libDirtSwingA", "freesound-651292", "freesound-651293", "freesound-674384", "freesound-674385", "freesound-674386", "freesound-728756", "freesound-728757", "freesound-728758", "freesound-728759", "libDirtBreak", "libStoneBreak", "freesound-536921", "freesound-703115", "libToolContact", "digOne", "digTwo", "dig-star-0", "starDestruction"],
 sourceLabels: { libDirtSwingA: "Swing / whoosh", "freesound-651292": "Dirt hit A", "freesound-651293": "Dirt hit B", "freesound-674384": "Stone hit A", "freesound-674385": "Stone hit B", "freesound-674386": "Stone hit C", "freesound-728756": "Metal hit A", "freesound-728757": "Metal hit B", "freesound-728758": "Metal hit C", "freesound-728759": "Metal hit D", libDirtBreak: "Earth destruction", libStoneBreak: "Stone / metal destruction", "freesound-536921": "Crystal break A", "freesound-703115": "Crystal break B", libToolContact: "Blocked hit / hard fallback", digOne: "Dirt fallback A", digTwo: "Dirt fallback B", "dig-star-0": "Star hit chime", starDestruction: "Star destruction" },
 issueLabels: ["Too loud", "Wrong material", "Late impact", "Long tail", "Too repetitive"],
 materialExamples: ["DIRT", "STONE", "COPPER", "STEEL", "GOLD", "GEODE_INTERIOR", "SKY_TILE"],
 excludeSuccessful: ["AIR", "BEDROCK", "FLOOR_TOWN_1", "FLOOR_TOWN_2", "CAVE_WALL", "GEODE_WALL", "CHEST", "GLOW_CRYSTAL", "RETIRED_RANDOM_BONUS_BLOCK"],
 gatedTiles: ["LAVA_DIRT", "OBSIDIAN", "EMBER_ORE", "MAGMA_CRYSTAL"],
});
