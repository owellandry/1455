import {
  MinIntervalGate,
  RollingWindowCounter,
  type AppStateSnapshotFields,
  type AppStateSnapshotReason,
} from "protocol";

const ROLLING_WINDOW_MS = 30_000;
const MIN_DELTA_BURST_EMIT_INTERVAL_MS = 5_000;

export type AppStateMetrics = {
  threadCountTotal: number;
  threadCountLoadedRecent: number;
  threadCountActive: number;
  threadCountWithInflightTurn: number;
  turnCountTotalLoaded: number;
  itemCountTotalLoaded: number;
  maxTurnsInSingleThread: number;
  maxItemsInSingleTurn: number;
  pendingRequestCount: number;
  inflightTurnCount: number;
  reviewDiffFilesTotal: number;
  reviewDiffLinesTotal: number;
  reviewDiffBytesEstimate: number;
};

type WebviewSamplerOptions = {
  enabled: boolean;
  getMetrics: () => AppStateMetrics;
};

export class WebviewSampler {
  private readonly startedAtMs = Date.now();
  private readonly getMetrics: () => AppStateMetrics;
  private readonly enabled: boolean;
  private totalDeltaEvents = 0;
  private totalDeltaBytesEstimate = 0;
  private readonly rollingDeltaCounter = new RollingWindowCounter({
    windowMs: ROLLING_WINDOW_MS,
  });
  private readonly deltaBurstEmitGate = new MinIntervalGate({
    minIntervalMs: MIN_DELTA_BURST_EMIT_INTERVAL_MS,
  });

  constructor(options: WebviewSamplerOptions) {
    this.enabled = options.enabled;
    this.getMetrics = options.getMetrics;
  }

  recordDeltaBytes(delta: string): boolean {
    if (!this.enabled) {
      return false;
    }
    const now = Date.now();
    const bytes = new TextEncoder().encode(delta).length;
    this.totalDeltaEvents += 1;
    this.totalDeltaBytesEstimate += bytes;
    this.rollingDeltaCounter.record(bytes, now);

    return this.deltaBurstEmitGate.tryPass(now);
  }

  collectSnapshot(reason: AppStateSnapshotReason): AppStateSnapshotFields {
    const now = Date.now();
    const metrics = this.getMetrics();
    const rollingSnapshot = this.rollingDeltaCounter.getSnapshot(now);

    return {
      event: "app_state_snapshot",
      schema_version: 1,
      snapshot_reason: reason,
      session_age_ms: now - this.startedAtMs,
      thread_count_total: metrics.threadCountTotal,
      thread_count_loaded_recent: metrics.threadCountLoadedRecent,
      thread_count_active: metrics.threadCountActive,
      thread_count_with_inflight_turn: metrics.threadCountWithInflightTurn,
      turn_count_total_loaded: metrics.turnCountTotalLoaded,
      item_count_total_loaded: metrics.itemCountTotalLoaded,
      max_turns_in_single_thread: metrics.maxTurnsInSingleThread,
      max_items_in_single_turn: metrics.maxItemsInSingleTurn,
      pending_request_count: metrics.pendingRequestCount,
      inflight_turn_count: metrics.inflightTurnCount,
      delta_events_total: this.totalDeltaEvents,
      delta_bytes_total_estimate: this.totalDeltaBytesEstimate,
      delta_events_last_30s: rollingSnapshot.count,
      delta_bytes_last_30s_estimate: rollingSnapshot.sum,
      review_diff_files_total: metrics.reviewDiffFilesTotal,
      review_diff_lines_total: metrics.reviewDiffLinesTotal,
      review_diff_bytes_estimate: metrics.reviewDiffBytesEstimate,
    };
  }
}
