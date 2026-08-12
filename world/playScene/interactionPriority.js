const infinity = Number.POSITIVE_INFINITY;

function distance(value) {
  return Number.isFinite(value) ? value : infinity;
}

export function resolveInteractionPriorities(rawDistances = {}) {
  const milestone = distance(rawDistances.milestone);
  const npc = distance(rawDistances.npc);
  const titan = distance(rawDistances.titan);
  const specialTile = distance(rawDistances.specialTile);
  const event = distance(rawDistances.event);
  const memoryReliquary = distance(rawDistances.memoryReliquary);
  const pillar = distance(rawDistances.pillar);
  return {
    specialTile: specialTile < infinity
      && specialTile <= Math.min(milestone, npc, titan, event, memoryReliquary, pillar),
    event: event < Math.min(milestone, npc, titan, specialTile, memoryReliquary, pillar),
    memoryReliquary: memoryReliquary < Math.min(milestone, npc, titan, specialTile, event, pillar),
    pillar: pillar < infinity
      && pillar <= Math.min(milestone, npc, titan, specialTile, event, memoryReliquary),
    milestone: milestone < Math.min(npc, titan, specialTile, event, memoryReliquary, pillar),
    titan: titan < Math.min(milestone, npc, specialTile, event, memoryReliquary, pillar),
    npcCompetitionDistance: Math.min(
      milestone,
      titan,
      specialTile,
      event,
      memoryReliquary,
      pillar,
    ),
  };
}
