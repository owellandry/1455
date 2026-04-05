import type { LocalOrRemoteConversationId } from "protocol";

import { messageBus } from "@/message-bus";

type TerminalCallbacks = {
  onData?: (data: string) => void;
  onExit?: (code: number | null, signal: string | null) => void;
  onError?: (message: string) => void;
  onInitLog?: (log: string) => void;
  onAttach?: (cwd: string, shell: string) => void;
};

type TerminalSessionSnapshot = {
  cwd: string;
  shell: string;
  buffer: string;
  truncated: boolean;
};

const MAX_BUFFER = 16000;

class TerminalService {
  private readonly listeners = new Map<string, TerminalCallbacks>();
  private readonly conversationSessions = new Map<string, string>();
  private readonly sessionConversations = new Map<string, string>();
  private readonly sessionSnapshots = new Map<
    string,
    TerminalSessionSnapshot
  >();

  constructor() {
    // TODO: expose terminal sessions to debugger tooling for easier triage.
    messageBus.subscribe("terminal-data", (payload) => {
      this.appendSnapshotBuffer(payload.sessionId, payload.data);
      this.listeners.get(payload.sessionId)?.onData?.(payload.data);
    });
    messageBus.subscribe("terminal-exit", (payload) => {
      this.listeners
        .get(payload.sessionId)
        ?.onExit?.(payload.code, payload.signal ?? null);
      this.deleteSessionMapping(payload.sessionId);
    });
    messageBus.subscribe("terminal-error", (payload) => {
      this.listeners.get(payload.sessionId)?.onError?.(payload.message);
    });
    messageBus.subscribe("terminal-init-log", (payload) => {
      this.replaceSnapshotBuffer(payload.sessionId, payload.log);
      this.listeners.get(payload.sessionId)?.onInitLog?.(payload.log);
    });
    messageBus.subscribe("terminal-attached", (payload) => {
      this.updateSnapshotMetadata(payload.sessionId, {
        cwd: payload.cwd,
        shell: payload.shell,
      });
      this.listeners
        .get(payload.sessionId)
        ?.onAttach?.(payload.cwd, payload.shell);
    });
  }

  create(options: {
    sessionId?: string;
    conversationId?: LocalOrRemoteConversationId | null;
    hostId?: string | null;
    cwd?: string | null;
    cols?: number;
    rows?: number;
  }): string {
    const sessionId = options.sessionId ?? this.makeId();
    if (options.conversationId) {
      this.setSessionMapping(sessionId, options.conversationId);
    }
    messageBus.dispatchMessage("terminal-create", { ...options, sessionId });
    return sessionId;
  }

  attach(options: {
    sessionId: string;
    conversationId?: LocalOrRemoteConversationId | null;
    hostId?: string | null;
    cwd?: string | null;
    forceCwdSync?: boolean;
    cols?: number;
    rows?: number;
  }): void {
    if (options.conversationId) {
      this.setSessionMapping(options.sessionId, options.conversationId);
    }
    messageBus.dispatchMessage("terminal-attach", options);
  }

  write(sessionId: string, data: string): void {
    messageBus.dispatchMessage("terminal-write", { sessionId, data });
  }

  runAction(
    sessionId: string,
    options: { cwd: string; command: string },
  ): void {
    messageBus.dispatchMessage("terminal-run-action", {
      sessionId,
      cwd: options.cwd,
      command: options.command,
    });
  }

  resize(sessionId: string, cols: number, rows: number): void {
    messageBus.dispatchMessage("terminal-resize", { sessionId, cols, rows });
  }

  close(sessionId: string): void {
    this.deleteSessionMapping(sessionId);
    messageBus.dispatchMessage("terminal-close", { sessionId });
  }

  closeForConversation(conversationId: LocalOrRemoteConversationId): void {
    const sessionId = this.conversationSessions.get(String(conversationId));
    if (!sessionId) {
      return;
    }
    this.close(sessionId);
  }

  /** Ensures we have a session mapped to the conversation before sending writes. */
  ensureConversationSession(
    conversationId: LocalOrRemoteConversationId,
    cwd?: string | null,
    hostId?: string | null,
  ): string {
    const existing = this.conversationSessions.get(String(conversationId));
    if (existing) {
      return existing;
    }
    return this.create({ conversationId, hostId, cwd });
  }

  getSessionForConversation(
    conversationId: LocalOrRemoteConversationId,
  ): string | null {
    return this.conversationSessions.get(String(conversationId)) ?? null;
  }

  /**
   * Returns the latest cached terminal state for a thread-owned session.
   */
  getSnapshotForConversation(
    conversationId: LocalOrRemoteConversationId,
  ): TerminalSessionSnapshot | null {
    const sessionId = this.getSessionForConversation(conversationId);
    if (sessionId == null) {
      return null;
    }
    return this.sessionSnapshots.get(sessionId) ?? null;
  }

  register(sessionId: string, callbacks: TerminalCallbacks): () => void {
    this.listeners.set(sessionId, callbacks);
    return () => {
      const existing = this.listeners.get(sessionId);
      if (existing === callbacks) {
        this.listeners.delete(sessionId);
      }
    };
  }

  private makeId(): string {
    if (typeof crypto?.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  /**
   * Seeds snapshot storage so readers can distinguish "no session"
   * from "no output yet".
   */
  private setSessionMapping(
    sessionId: string,
    conversationId: LocalOrRemoteConversationId,
  ): void {
    const key = String(conversationId);
    this.conversationSessions.set(key, sessionId);
    this.sessionConversations.set(sessionId, key);
    if (!this.sessionSnapshots.has(sessionId)) {
      this.sessionSnapshots.set(sessionId, {
        cwd: "",
        shell: "unknown",
        buffer: "",
        truncated: false,
      });
    }
  }

  /**
   * Drops both lookup directions and any cached terminal output
   * for the detached session.
   */
  private deleteSessionMapping(sessionId: string): void {
    const conversationId = this.sessionConversations.get(sessionId);
    if (!conversationId) {
      this.sessionSnapshots.delete(sessionId);
      return;
    }
    this.sessionConversations.delete(sessionId);
    const existing = this.conversationSessions.get(conversationId);
    if (existing === sessionId) {
      this.conversationSessions.delete(conversationId);
    }
    this.sessionSnapshots.delete(sessionId);
  }

  /**
   * Keeps only the latest terminal tail so tool reads stay bounded.
   */
  private appendSnapshotBuffer(sessionId: string, data: string): void {
    const current = this.getOrCreateSnapshot(sessionId);
    const nextBuffer = `${current.buffer}${data}`;
    current.buffer = nextBuffer.slice(-MAX_BUFFER);
    current.truncated = nextBuffer.length > MAX_BUFFER;
  }

  /**
   * Replaces the cached output when the host replays the full terminal init log.
   */
  private replaceSnapshotBuffer(sessionId: string, buffer: string): void {
    const current = this.getOrCreateSnapshot(sessionId);
    current.buffer = buffer.slice(-MAX_BUFFER);
    current.truncated = buffer.length > MAX_BUFFER;
  }

  /**
   * Tracks terminal metadata alongside buffered output
   * for snapshot tool responses.
   */
  private updateSnapshotMetadata(
    sessionId: string,
    metadata: {
      cwd: string;
      shell: string;
    },
  ): void {
    const current = this.getOrCreateSnapshot(sessionId);
    current.cwd = metadata.cwd;
    current.shell = metadata.shell;
  }

  /**
   * Lazily creates snapshot storage for sessions observed
   * before explicit mapping setup.
   */
  private getOrCreateSnapshot(sessionId: string): TerminalSessionSnapshot {
    const existing = this.sessionSnapshots.get(sessionId);
    if (existing != null) {
      return existing;
    }
    const snapshot = {
      cwd: "",
      shell: "unknown",
      buffer: "",
      truncated: false,
    };
    this.sessionSnapshots.set(sessionId, snapshot);
    return snapshot;
  }
}

export const terminalService = new TerminalService();
