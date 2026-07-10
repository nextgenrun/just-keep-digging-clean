// ==================== DEPTH MILESTONES ====================
// Milestones trigger at specific depths with rewards and a HUD notification.
// A physical milestone board is placed in town (left side) showing all milestones.

export const DEPTH_MILESTONES = [
  { depth: 100,  name: 'Novice Miner',     reward: '+1 GP Max',              gpMaxBonus: 1 },
  { depth: 200,  name: 'Dirt Digger',      reward: '+2% Mining Speed',      miningSpeedPct: 2 },
  { depth: 300,  name: 'Cave Explorer',    reward: '+1% Crit Chance',       critChancePct: 1 },
  { depth: 400,  name: 'Stone Breaker',    reward: '+2 GP Max',             gpMaxBonus: 2 },
  { depth: 500,  name: 'Deep Delver',      reward: '+3% Mining Speed',      miningSpeedPct: 3 },
  { depth: 600,  name: 'Bronze Collector', reward: '+1 GP Max',             gpMaxBonus: 1 },
  { depth: 700,  name: 'Iron Grasp',       reward: '+2% Crit Chance',       critChancePct: 2 },
  { depth: 750,  name: 'The Descent',      reward: '+4 GP Max',             gpMaxBonus: 4 },
  { depth: 800,  name: 'Steel Will',       reward: '+3 GP Max',             gpMaxBonus: 3 },
  { depth: 900,  name: 'Silver Tongue',    reward: '+4% Mining Speed',      miningSpeedPct: 4 },
  { depth: 1000, name: 'Gold Seeker',      reward: '+5 GP Max',             gpMaxBonus: 5 },
  { depth: 1100, name: 'Crystal Mind',     reward: '+1% Crit Chance',       critChancePct: 1 },
  { depth: 1200, name: 'Dark Heart',       reward: '+5% Mining Speed',      miningSpeedPct: 5 },
  { depth: 1300, name: 'Void Walker',      reward: '+5 GP Max',             gpMaxBonus: 5 },
  { depth: 1400, name: 'Abyss Gazer',      reward: '+3% Crit Chance',       critChancePct: 3 },
  { depth: 1500, name: 'Core Runner',      reward: '+8% Mining Speed',      miningSpeedPct: 8 },
  { depth: 1600, name: 'Legend',           reward: '+10 GP Max',            gpMaxBonus: 10 },
  { depth: 1700, name: 'Myth Breaker',     reward: '+5% Crit Chance',       critChancePct: 5 },
  { depth: 1800, name: 'Eternal Flame',    reward: '+15 GP Max',            gpMaxBonus: 15 },
  { depth: 1900, name: 'The Unstoppable',  reward: '+10% Mining Speed',     miningSpeedPct: 10 },
  { depth: 2000, name: 'The King',         reward: '+20 GP Max',            gpMaxBonus: 20 },
];

/**
 * Get the milestone for a given depth (exact match, or null)
 */
export function getMilestoneAtDepth(depth) {
  return DEPTH_MILESTONES.find(m => m.depth === depth) || null;
}

/**
 * Get all milestones up to a given depth (inclusive)
 */
export function getMilestonesUpToDepth(depth) {
  return DEPTH_MILESTONES.filter(m => m.depth <= depth);
}

/**
 * Get the next milestone not yet reached
 */
export function getNextMilestone(currentDepth) {
  return DEPTH_MILESTONES.find(m => m.depth > currentDepth) || null;
}

/**
 * Get the last reached milestone depth (0 if none)
 */
export function getLastReachedMilestoneDepth(reachedDepths) {
  if (!reachedDepths || reachedDepths.length === 0) return 0;
  return Math.max(...reachedDepths);
}

/**
 * Calculate total stat bonuses from all reached milestones
 */
export function computeMilestoneBonuses(reachedDepths) {
  const bonuses = { gpMaxBonus: 0, miningSpeedPct: 0, critChancePct: 0 };
  if (!reachedDepths) return bonuses;
  for (const depth of reachedDepths) {
    const m = getMilestoneAtDepth(depth);
    if (m) {
      bonuses.gpMaxBonus += m.gpMaxBonus || 0;
      bonuses.miningSpeedPct += m.miningSpeedPct || 0;
      bonuses.critChancePct += m.critChancePct || 0;
    }
  }
  return bonuses;
}