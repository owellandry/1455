type TextDeltaTarget =
  | { type: "agentMessage" }
  | { type: "plan" }
  | { type: "reasoningSummary"; summaryIndex: number }
  | { type: "reasoningContent"; contentIndex: number };

export type TextDeltaEntry<TConversationId extends string> = {
  conversationId: TConversationId;
  turnId: string | null;
  itemId: string;
  target: TextDeltaTarget;
  delta: string;
};

type FrameTextDeltaQueueOptions<TConversationId extends string> = {
  onFlush: (entries: Array<TextDeltaEntry<TConversationId>>) => void;
  fallbackIntervalMs?: number;
};

const DEFAULT_FALLBACK_INTERVAL_MS = 16;

/**
 * Batches streaming text deltas and flushes them once per frame.
 *
 * Deltas are coalesced by `conversationId` + `turnId` + `itemId` + target key.
 * The queue prefers `requestAnimationFrame` when visible and falls back to a
 * timeout when hidden/non-browser so background tabs still make progress.
 */
export class FrameTextDeltaQueue<TConversationId extends string> {
  private readonly buffers = new Map<string, TextDeltaEntry<TConversationId>>();
  private flushHandle: number | ReturnType<typeof setTimeout> | null = null;
  private flushScheduler: "animationFrame" | "timeout" | null = null;
  private readonly onFlush: (
    entries: Array<TextDeltaEntry<TConversationId>>,
  ) => void;
  private readonly fallbackIntervalMs: number;

  constructor(options: FrameTextDeltaQueueOptions<TConversationId>) {
    this.onFlush = options.onFlush;
    this.fallbackIntervalMs =
      options.fallbackIntervalMs ?? DEFAULT_FALLBACK_INTERVAL_MS;
  }

  enqueue(entry: TextDeltaEntry<TConversationId>): void {
    const key = this.buildKey(entry);
    const existing = this.buffers.get(key);
    const current = existing?.delta ?? "";
    const next = `${current}${entry.delta}`;

    this.buffers.set(key, {
      conversationId: entry.conversationId,
      turnId: entry.turnId,
      itemId: entry.itemId,
      target: entry.target,
      delta: next,
    });
    this.scheduleFlush();
  }

  flushNow(): void {
    this.cancelScheduledFlush();
    if (this.buffers.size === 0) {
      return;
    }
    const pending = Array.from(this.buffers.values());
    this.buffers.clear();
    this.onFlush(pending);
  }

  private scheduleFlush(): void {
    if (this.flushHandle != null) {
      return;
    }

    if (this.canUseAnimationFrame()) {
      this.flushScheduler = "animationFrame";
      this.flushHandle = window.requestAnimationFrame(() => {
        this.flushHandle = null;
        this.flushScheduler = null;
        this.flushNow();
      });
      return;
    }

    this.flushScheduler = "timeout";
    this.flushHandle = setTimeout(() => {
      this.flushHandle = null;
      this.flushScheduler = null;
      this.flushNow();
    }, this.fallbackIntervalMs);
  }

  private cancelScheduledFlush(): void {
    if (this.flushHandle == null) {
      return;
    }
    if (this.flushScheduler === "animationFrame") {
      if (
        typeof window !== "undefined" &&
        typeof window.cancelAnimationFrame === "function"
      ) {
        window.cancelAnimationFrame(this.flushHandle as number);
      }
    } else {
      clearTimeout(this.flushHandle as ReturnType<typeof setTimeout>);
    }
    this.flushHandle = null;
    this.flushScheduler = null;
  }

  private canUseAnimationFrame(): boolean {
    if (typeof window === "undefined") {
      return false;
    }
    if (typeof window.requestAnimationFrame !== "function") {
      return false;
    }
    if (typeof document === "undefined") {
      return true;
    }
    return document.visibilityState === "visible";
  }

  private buildKey(entry: TextDeltaEntry<TConversationId>): string {
    const targetKey = this.getTargetKey(entry.target);
    return `${entry.conversationId}:${entry.turnId ?? "null"}:${entry.itemId}:${targetKey}`;
  }

  private getTargetKey(target: TextDeltaTarget): string {
    switch (target.type) {
      case "agentMessage":
      case "plan":
        return target.type;
      case "reasoningSummary":
        return `${target.type}:${target.summaryIndex}`;
      case "reasoningContent":
        return `${target.type}:${target.contentIndex}`;
    }
  }
}
