/** Deterministic PRNG so mock data stays identical across screens and reloads. */
export class Rng {
  private s: number;
  constructor(seed: number) {
    this.s = (seed ^ 0x9e3779b9) >>> 0 || 1;
  }
  next() {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  float(min: number, max: number) {
    return min + (max - min) * this.next();
  }
  int(min: number, max: number) {
    return Math.floor(this.float(min, max + 1));
  }
  chance(p: number) {
    return this.next() < p;
  }
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
  weighted<T>(arr: readonly T[], weights: readonly number[]): T {
    const total = weights.reduce((a, b) => a + b, 0);
    let r = this.next() * total;
    for (let i = 0; i < arr.length; i++) {
      r -= weights[i];
      if (r <= 0) return arr[i];
    }
    return arr[arr.length - 1];
  }
  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  /** Split `total` into integer parts proportional to (noisy) weights. */
  distribute(total: number, weights: number[], noise = 0.35): number[] {
    const w = weights.map((x) =>
      Math.max(0.01, x * (1 + this.float(-noise, noise))),
    );
    const sum = w.reduce((a, b) => a + b, 0);
    const raw = w.map((x) => (x / sum) * total);
    const out = raw.map(Math.floor);
    let rest = total - out.reduce((a, b) => a + b, 0);
    const order = raw
      .map((x, i) => [x - Math.floor(x), i] as const)
      .sort((a, b) => b[0] - a[0]);
    for (let k = 0; rest > 0; k++, rest--) out[order[k % order.length][1]]++;
    return out;
  }
}

export function hashString(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

export function memo<A extends string | number, R>(
  fn: (a: A) => R,
): (a: A) => R {
  const cache = new Map<A, R>();
  return (a: A) => {
    if (!cache.has(a)) cache.set(a, fn(a));
    return cache.get(a)!;
  };
}
