import { findSearchMatchElement } from "@/content-search/highlight-marks";

export function waitForLayout(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        resolve();
      });
    });
  });
}

export function scrollToMatchInContainer({
  container,
  matchId,
  includeShadowRoots,
  scrollBehavior = "smooth",
  signal,
  timeoutMs = 1500,
}: {
  container: HTMLElement;
  matchId: string;
  includeShadowRoots: boolean;
  scrollBehavior?: ScrollBehavior;
  signal?: AbortSignal;
  timeoutMs?: number;
}): Promise<void> {
  const findMatch = (): HTMLElement | null => {
    return findSearchMatchElement({
      container,
      matchId,
      includeShadowRoots,
    });
  };

  const immediateMatch = findMatch();
  if (immediateMatch != null) {
    immediateMatch.scrollIntoView({
      block: "center",
      behavior: scrollBehavior,
    });
    return Promise.resolve();
  }
  if (signal?.aborted) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let rafId: number | null = null;
    let timeoutId: number | null = null;

    function cleanup(): void {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        timeoutId = null;
      }
      signal?.removeEventListener("abort", onAbort);
    }

    function finish(matchElement?: HTMLElement | null): void {
      cleanup();
      if (matchElement != null) {
        matchElement.scrollIntoView({
          block: "center",
          behavior: scrollBehavior,
        });
      }
      resolve();
    }

    function onAbort(): void {
      finish();
    }

    function check(): void {
      if (signal?.aborted) {
        finish();
        return;
      }
      const matchElement = findMatch();
      if (matchElement != null) {
        finish(matchElement);
        return;
      }
      rafId = window.requestAnimationFrame(check);
    }

    signal?.addEventListener("abort", onAbort, { once: true });
    timeoutId = window.setTimeout(() => {
      finish();
    }, timeoutMs);
    rafId = window.requestAnimationFrame(check);
  });
}
