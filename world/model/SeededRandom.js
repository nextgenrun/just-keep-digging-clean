/**
 * SeededRandom — Deterministic PRNG for world generation.
 * Uses a simple LCG (Linear Congruential Generator) for reproducibility.
 */
export class SeededRandom {
  constructor(seed) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  /** Returns a float in [0, 1) */
  next() {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Returns a float in [min, max) */
  nextFloat(min, max) {
    return this.next() * (max - min) + min;
  }

  /** Shuffle an array in place (Fisher-Yates) */
  shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Pick a random element from an array */
  pick(array) {
    return array[this.nextInt(0, array.length - 1)];
  }

  /** Pick based on weighted probabilities. weights array must sum to 1 */
  weightedPick(items, weights) {
    const r = this.next();
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      cumulative += weights[i];
      if (r < cumulative) return items[i];
    }
    return items[items.length - 1];
  }
}