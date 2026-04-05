// oxlint-disable-next-line import/default
import ShikiWorkerUrl from "@pierre/diffs/worker/worker.js?worker&url";

export function shikiWorkerFactoryVite(): Worker {
  return new Worker(ShikiWorkerUrl, { type: "module" });
}
