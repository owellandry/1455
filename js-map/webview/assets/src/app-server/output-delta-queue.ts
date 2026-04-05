import { appendCappedOutput } from "./append-capped-output";

type OutputDeltaEntry<TConversationId extends string> = {
  conversationId: TConversationId;
  turnId: string | null;
  itemId: string;
  delta: string;
};

type OutputDeltaQueueOptions<TConversationId extends string> = {
  flushIntervalMs: number;
  onFlush: (entries: Array<OutputDeltaEntry<TConversationId>>) => void;
  maxBufferedChars?: number;
};

export class OutputDeltaQueue<TConversationId extends string> {
  private readonly buffers = new Map<
    string,
    OutputDeltaEntry<TConversationId>
  >();
  private flushHandle: ReturnType<typeof setTimeout> | null = null;
  private readonly flushIntervalMs: number;
  private readonly onFlush: (
    entries: Array<OutputDeltaEntry<TConversationId>>,
  ) => void;
  private readonly maxBufferedChars: number | undefined;

  constructor(options: OutputDeltaQueueOptions<TConversationId>) {
    this.flushIntervalMs = options.flushIntervalMs;
    this.onFlush = options.onFlush;
    this.maxBufferedChars = options.maxBufferedChars;
  }

  enqueue(entry: OutputDeltaEntry<TConversationId>): void {
    const key = this.buildKey(entry);
    const existing = this.buffers.get(key);
    const current = existing?.delta ?? "";
    const { next } = appendCappedOutput({
      current,
      delta: entry.delta,
      maxChars: this.maxBufferedChars,
    });

    this.buffers.set(key, {
      conversationId: entry.conversationId,
      turnId: entry.turnId,
      itemId: entry.itemId,
      delta: next,
    });
    this.scheduleFlush();
  }

  flushNow(): void {
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

    this.flushHandle = setTimeout(() => {
      this.flushHandle = null;
      this.flushNow();
    }, this.flushIntervalMs);
  }

  private buildKey(entry: OutputDeltaEntry<TConversationId>): string {
    return `${entry.conversationId}:${entry.turnId ?? "null"}:${entry.itemId}`;
  }
}
