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
  const understar = distance(rawDistances.understar);
  return {
    specialTile: specialTile < infinity
      && specialTile <= Math.min(milestone, npc, titan, event, memoryReliquary, pillar, understar),
    event: event < Math.min(milestone, npc, titan, specialTile, memoryReliquary, pillar, understar),
    memoryReliquary: memoryReliquary < Math.min(milestone, npc, titan, specialTile, event, pillar, understar),
    pillar: pillar < infinity
      && pillar <= Math.min(milestone, npc, titan, specialTile, event, memoryReliquary, understar),
    understar: understar < infinity
      && understar <= Math.min(milestone, npc, titan, specialTile, event, memoryReliquary, pillar),
    milestone: milestone < Math.min(npc, titan, specialTile, event, memoryReliquary, pillar, understar),
    titan: titan < Math.min(milestone, npc, specialTile, event, memoryReliquary, pillar, understar),
    npcCompetitionDistance: Math.min(
      milestone,
      titan,
      specialTile,
      event,
      memoryReliquary,
      pillar,
      understar,
    ),
  };
}
