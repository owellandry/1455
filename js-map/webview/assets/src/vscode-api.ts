import {
  useMutation,
  useQuery,
  type UseMutationOptions,
  type UseMutationResult,
  type UseQueryOptions,
  type UseQueryResult,
} from "@tanstack/react-query";
import type { VSCodeFetchRequest } from "protocol";

import { QUERY_STALE_TIME } from "./utils/query-stale-times";
import { WebFetchWrapper } from "./web-fetch-wrapper";

type VSData<T extends keyof VSCodeFetchRequest> =
  VSCodeFetchRequest[T]["response"];
type VSInitial<T extends keyof VSCodeFetchRequest> = UseQueryOptions<
  VSData<T>,
  Error
>["initialData"];
type VSPlaceholder<T extends keyof VSCodeFetchRequest> = UseQueryOptions<
  VSData<T>,
  Error
>["placeholderData"];
type VSRequest<T extends keyof VSCodeFetchRequest> =
  VSCodeFetchRequest[T]["request"];

export type VSCodeMutationResult<T extends keyof VSCodeFetchRequest> =
  UseMutationResult<VSData<T>, Error, VSRequest<T>>;

export type VSCodeMutationOptions<T extends keyof VSCodeFetchRequest> = Omit<
  UseMutationOptions<VSData<T>, Error, VSRequest<T>>,
  "mutationFn"
>;

interface QueryConfig<T extends keyof VSCodeFetchRequest> {
  /**
   * Additional identifier for our query key
   */
  cacheKey?: string | Array<unknown>;
  /**
   * query will not run until this is true
   */
  enabled?: boolean;
  /**
   * Re-fetch the data every `intervalMs` milliseconds.
   */
  intervalMs?: number;
  /**
   * The time to keep the data in the cache.
   */
  staleTime?: number;

  /**
   * The initial data to use for the query.
   */
  initialData?: VSInitial<T>;
}

export const VSCODE_QUERY_KEY_PREFIX = "vscode";

export function getQueryKey<
  T extends keyof VSCodeFetchRequest,
  P extends VSCodeFetchRequest[T]["request"],
>(type: T, params?: P, cacheKey?: string | Array<unknown>): Array<unknown> {
  return [
    VSCODE_QUERY_KEY_PREFIX,
    type,
    ...(cacheKey == null
      ? []
      : Array.isArray(cacheKey)
        ? cacheKey
        : [cacheKey]),
    params ? JSON.stringify(params) : undefined,
    // Filter out undefined so you can invalidate the query based on the key without params.
  ].filter((value) => value !== undefined);
}

type FetchOptions<T extends keyof VSCodeFetchRequest, D> = {
  queryConfig?: QueryConfig<T>;
  select?: (data: VSCodeFetchRequest[T]["response"]) => D;
  placeholderData?: VSPlaceholder<T>;
} & (undefined extends VSRequest<T>
  ? { params?: VSRequest<T> }
  : { params: VSRequest<T> });

type FetchArgs<T extends keyof VSCodeFetchRequest, D> =
  undefined extends VSRequest<T>
    ? [type: T, options?: FetchOptions<T, D>]
    : [type: T, options: FetchOptions<T, D>];

type FetchDirectOptions<T extends keyof VSCodeFetchRequest, D> = {
  select?: (data: VSCodeFetchRequest[T]["response"]) => D;
  signal?: AbortSignal;
} & (undefined extends VSRequest<T>
  ? { params?: VSRequest<T> }
  : { params: VSRequest<T> });

type FetchDirectArgs<T extends keyof VSCodeFetchRequest, D> =
  undefined extends VSRequest<T>
    ? [type: T, options?: FetchDirectOptions<T, D>]
    : [type: T, options: FetchDirectOptions<T, D>];

export function useFetchFromVSCode<
  T extends keyof VSCodeFetchRequest,
  D = VSCodeFetchRequest[T]["response"],
>(...args: FetchArgs<T, D>): UseQueryResult<D, Error> {
  const [type, options] = args;
  const { params, queryConfig, placeholderData } = options ?? {};
  const { cacheKey, intervalMs, enabled, staleTime, initialData } =
    queryConfig ?? {};
  const resolvedStaleTime = staleTime ?? QUERY_STALE_TIME.FIVE_SECONDS;

  const queryOptions = {
    queryKey: getQueryKey(type, params, cacheKey),
    queryFn: async (): Promise<VSCodeFetchRequest[T]["response"]> => {
      const response = await WebFetchWrapper.getInstance().post(
        `vscode://codex/${type}`,
        JSON.stringify(params),
      );
      return response.body as VSCodeFetchRequest[T]["response"];
    },
    select: options?.select,
    refetchInterval: intervalMs,
    enabled,
    staleTime: resolvedStaleTime,
    ...(initialData !== undefined ? { initialData } : {}),
    ...(placeholderData !== undefined ? { placeholderData } : {}),
  } satisfies UseQueryOptions<VSCodeFetchRequest[T]["response"], Error, D>;

  return useQuery(queryOptions);
}

export async function fetchFromVSCode<
  T extends keyof VSCodeFetchRequest,
  D = VSCodeFetchRequest[T]["response"],
>(...args: FetchDirectArgs<T, D>): Promise<D> {
  const [type, options] = args;
  const { params, select, signal } = options ?? {};

  const response = await WebFetchWrapper.getInstance().post(
    `vscode://codex/${type}`,
    JSON.stringify(params),
    undefined,
    signal,
  );

  const data = response.body as VSCodeFetchRequest[T]["response"];
  return select ? select(data) : (data as unknown as D);
}

export function useMutationFromVSCode<T extends keyof VSCodeFetchRequest>(
  type: T,
  options?: VSCodeMutationOptions<T>,
): VSCodeMutationResult<T> {
  return useMutation({
    mutationFn: async (
      params: VSCodeFetchRequest[T]["request"],
    ): Promise<VSCodeFetchRequest[T]["response"]> => {
      const response = await WebFetchWrapper.getInstance().post(
        `vscode://codex/${type}`,
        JSON.stringify(params),
      );
      return response.body as VSCodeFetchRequest[T]["response"];
    },
    ...options,
  });
}
