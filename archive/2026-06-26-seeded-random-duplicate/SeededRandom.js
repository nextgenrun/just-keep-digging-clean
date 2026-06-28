/**
 * SeededRandom — deterministic pseudo-random number generator.
 * Uses a simple mulberry32 algorithm for fast, deterministic randomness.
 */
export class SeededRandom {
  constructor(seed = 133742) {
    this.state = seed >>> 0;
  }

  /** Returns a float in [0, 1) */
  next() {
    let t = (this.state += 0x6d2b79f5) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Returns an integer in [min, max] inclusive */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Pick a random element from an array */
  pick(arr) {
    return arr[this.nextInt(0, arr.length - 1)];
  }

  /** Shuffle an array in-place */
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}