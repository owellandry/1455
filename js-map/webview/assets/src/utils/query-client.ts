import type { QueryClientConfig } from "@tanstack/react-query";

import { FetchError } from "../web-fetch-wrapper";

const MAX_RETRIES = 3;

export const codexQueryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      retry: (failureCount, error): boolean => {
        if (failureCount >= MAX_RETRIES) {
          return false;
        }
        const status = extractStatus(error);
        return !status || shouldRetryStatus(status);
      },
    },
  },
};

function shouldRetryStatus(status: number): boolean {
  return (
    status === 408 ||
    status === 425 ||
    status === 429 ||
    (status >= 500 && status <= 599)
  );
}

function extractStatus(error: unknown): number | null {
  if (error instanceof FetchError) {
    return error.status;
  }
  if (
    error != null &&
    typeof error === "object" &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
  ) {
    return (error as { status: number }).status;
  }
  return null;
}
