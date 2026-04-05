import type * as AppServer from "app-server-types";
import type { ConversationId } from "protocol";

type PrewarmedThreadEntry = {
  promise: Promise<AppServer.v2.ThreadStartResponse | null>;
  conversationId: ConversationId | null;
  createdAtSeconds: number | null;
};

// Keep slightly under 5 minutes because the websocket can be closed after
// 5 minutes of idle time https://github.com/openai/codex/blob/378f1cabe828406d6f71c0e514775b2c01b661fe/codex-rs/core/src/model_provider_info.rs#L217.
const MAX_PREWARMED_THREAD_AGE_SECONDS = 4.75 * 60;

export class PrewarmedThreadManager {
  private readonly prewarmedThreadByCwd = new Map<
    string,
    PrewarmedThreadEntry
  >();

  /**
   * Registers (or replaces) the prewarmed thread entry for a cwd.
   *
   * A new entry starts "in-flight" (`conversationId`/`createdAtSeconds` are
   * null) and is later finalized by `setPrewarmedThreadMetadata`.
   */
  setPrewarmedThreadPromise(
    cwd: string,
    promise: Promise<AppServer.v2.ThreadStartResponse | null>,
  ): void {
    this.prewarmedThreadByCwd.set(cwd, {
      promise,
      conversationId: null,
      createdAtSeconds: null,
    });
  }

  /** Clears prewarmed thread state for a cwd. */
  clearPrewarmedThreadPromise(cwd: string): void {
    this.prewarmedThreadByCwd.delete(cwd);
  }

  /** Clears all tracked prewarmed thread state. */
  clearAllPrewarmedThreadPromises(): void {
    this.prewarmedThreadByCwd.clear();
  }

  /**
   * Returns whether a cwd has a usable prewarmed entry.
   *
   * Usable means:
   * - in-flight (metadata not attached yet), or
   * - metadata attached and still within the freshness window.
   *
   * Stale entries return false and are left in the map until consumed, cleared,
   * or replaced.
   */
  hasPrewarmedThread(cwd: string): boolean {
    const entry = this.prewarmedThreadByCwd.get(cwd);
    if (!entry) {
      return false;
    }

    if (
      entry.createdAtSeconds == null ||
      this.isFresh(entry.createdAtSeconds)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Attaches conversation metadata to an existing prewarmed entry after
   * `thread/start` resolves.
   *
   * No-ops when the cwd has no active entry.
   */
  setPrewarmedThreadMetadata({
    cwd,
    conversationId,
    createdAtSeconds,
  }: {
    cwd: string;
    conversationId: ConversationId;
    createdAtSeconds: number;
  }): void {
    const entry = this.prewarmedThreadByCwd.get(cwd);
    if (!entry) {
      return;
    }
    entry.conversationId = conversationId;
    entry.createdAtSeconds = createdAtSeconds;
  }

  /**
   * Consumes and clears the prewarmed thread for a cwd.
   * Returns null when no entry exists or the prewarmed startup failed.
   *
   * This method does not enforce freshness; callers should gate with
   * `hasPrewarmedThread` before consuming.
   */
  async consumePrewarmedThread(
    cwd: string,
  ): Promise<AppServer.v2.ThreadStartResponse | null> {
    const entry = this.prewarmedThreadByCwd.get(cwd);
    if (!entry) {
      return null;
    }
    const response = await entry.promise;
    this.deleteEntry(cwd, entry);
    if (response == null) {
      return null;
    }
    return response;
  }

  /**
   * Returns whether a conversation id belongs to a currently tracked prewarmed
   * thread. Only entries with attached metadata can match.
   */
  isPrewarmedConversation(conversationId: ConversationId): boolean {
    for (const entry of this.prewarmedThreadByCwd.values()) {
      if (entry.conversationId === conversationId) {
        return true;
      }
    }
    return false;
  }

  /**
   * Deletes a specific prewarmed entry for a cwd if it still references the
   * same entry object.
   */
  private deleteEntry(cwd: string, entry: PrewarmedThreadEntry): void {
    if (this.prewarmedThreadByCwd.get(cwd) === entry) {
      this.prewarmedThreadByCwd.delete(cwd);
    }
  }

  /**
   * Returns true when the thread age is below the configured prewarmed TTL.
   */
  private isFresh(createdAtSeconds: number): boolean {
    return (
      Date.now() / 1000 - createdAtSeconds < MAX_PREWARMED_THREAD_AGE_SECONDS
    );
  }
}
