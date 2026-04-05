type RollingEntry = {
  atMs: number;
  value: number;
};

export type RollingWindowCounterOptions = {
  windowMs: number;
};

export class RollingWindowCounter {
  private readonly windowMs: number;
  private readonly entries: Array<RollingEntry> = [];
  private headIndex = 0;
  private rollingSum = 0;

  constructor(options: RollingWindowCounterOptions) {
    this.windowMs = options.windowMs;
  }

  record(value: number, nowMs = Date.now()): void {
    this.entries.push({ atMs: nowMs, value });
    this.rollingSum += value;
    this.prune(nowMs);
  }

  getSnapshot(nowMs = Date.now()): { count: number; sum: number } {
    this.prune(nowMs);
    return {
      count: this.entries.length - this.headIndex,
      sum: this.rollingSum,
    };
  }

  private prune(nowMs: number): void {
    const cutoff = nowMs - this.windowMs;
    while (
      this.headIndex < this.entries.length &&
      this.entries[this.headIndex].atMs < cutoff
    ) {
      this.rollingSum -= this.entries[this.headIndex].value;
      this.headIndex += 1;
    }

    if (this.headIndex === 0) {
      return;
    }
    if (this.headIndex * 2 < this.entries.length) {
      return;
    }

    this.entries.splice(0, this.headIndex);
    this.headIndex = 0;
  }
}
