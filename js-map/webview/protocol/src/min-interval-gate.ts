/**
 * Lightweight rate limiter for one-off signals.
 * Use this when callers should only emit or execute once per minimum interval.
 */
export class MinIntervalGate {
  private readonly minIntervalMs: number;
  private lastMarkedAtMs = Number.NEGATIVE_INFINITY;

  constructor(options: { minIntervalMs: number }) {
    this.minIntervalMs = options.minIntervalMs;
  }

  canPass(nowMs = Date.now()): boolean {
    return nowMs - this.lastMarkedAtMs >= this.minIntervalMs;
  }

  mark(nowMs = Date.now()): void {
    this.lastMarkedAtMs = nowMs;
  }

  tryPass(nowMs = Date.now()): boolean {
    if (!this.canPass(nowMs)) {
      return false;
    }

    this.mark(nowMs);
    return true;
  }
}
