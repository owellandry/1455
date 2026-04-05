import type {
  MutationFunctionContext,
  MutationObserverOptions,
  QueryKey,
  QueryObserverOptions,
  QueryObserverResult,
} from "@tanstack/query-core";
import { observe } from "jotai-effect";
import { atomWithQuery } from "jotai-tanstack-query";
import { atom, type Atom, type PrimitiveAtom } from "jotai/vanilla";

import {
  createReactiveScope,
  createKeyedFamilyHelpers,
  createReadParams,
  createScopedHandle,
  createScopeContextSnapshot,
  createScopedParams,
  isFamilySignal,
  readScopeContextVersions,
  resolveScopeNodeFromContext,
  setSignalValue,
} from "./runtime";
import type {
  AnyScopeToken,
  DestructorFn,
  FamilyHandle,
  FamilySignal,
  FamilyValue,
  HandleSignalValue,
  HandleScope,
  HandleValue,
  IsSignalHandle,
  IsScopeReachableFrom,
  IsValueHandle,
  ReadParams,
  Scope,
  ScopeValueObject,
  ScopeValuesForToken,
  ScopedHandle,
  ScopedParams,
  SignalHandle,
  SignalOptions,
  ScopeToken,
  UpdateFn,
  ValueHandle,
  WatchCallback,
} from "./types";

export type MutationSignalResult<TData, TError, TVariables> = {
  data: TData | undefined;
  error: TError | null;
  isError: boolean;
  isIdle: boolean;
  isPending: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => void;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  status: "idle" | "pending" | "success" | "error";
  variables: TVariables | undefined;
};

/**
 * Declares a scope boundary that can own Maitai state, effects, and keyed families.
 * Scope values must be JSON-serializable objects.
 *
 * @param name Stable brand name used to identify the scope in the type system.
 * @param options Optional scope configuration.
 * @param options.key Optional function that derives the mounted scope instance key from the provided scope value.
 *   When omitted, the mounted scope key defaults to the stringified scope value.
 *   Prefer omitting `key` when the full JSON scope value already represents identity.
 *   Provide an explicit key only when the scope value contains non-identity fields that can change without resetting state.
 *   When the key stays the same across renders, scoped state is preserved.
 * @param options.parent Optional parent scope token that this scope can read from.
 * @example
 * ```ts
 * const AppScope = scope("AppScope");
 *
 * const ReviewScope = scope("ReviewScope", {
 *   key: (value: { reviewId: string }) => value.reviewId,
 *   parent: AppScope,
 * });
 * ```
 */
export function scope<
  TName extends string,
  TValue extends ScopeValueObject = {},
>(
  name: TName,
  options?: {
    key?: { bivarianceHack(value: TValue): unknown }["bivarianceHack"];
  },
): ScopeToken<TName, TValue>;
export function scope<
  TName extends string,
  TValue extends ScopeValueObject = {},
  TParent extends AnyScopeToken = AnyScopeToken,
>(
  name: TName,
  options: {
    key?: { bivarianceHack(value: TValue): unknown }["bivarianceHack"];
    parent: TParent;
  },
): ScopeToken<TName, TValue, TParent>;
export function scope<
  TName extends string,
  TValue extends ScopeValueObject = {},
  TParent extends AnyScopeToken = AnyScopeToken,
>(
  name: TName,
  options?: {
    key?: { bivarianceHack(value: TValue): unknown }["bivarianceHack"];
    parent?: TParent;
  },
): ScopeToken<TName, TValue, TParent | undefined> {
  return {
    __scopeBrand: name,
    getKey: options?.key,
    id: Symbol(),
    parent: options?.parent,
  } as ScopeToken<TName, TValue, TParent | undefined>;
}

/**
 * Creates writable scoped state owned by a scope instance.
 *
 * @param scopeToken Scope token that owns the signal.
 * @param initialValue Initial signal value, or a function that derives the initial value from the mounted scope context.
 * @example
 * ```ts
 * const count$ = signal(ReviewScope, 0);
 * const label$ = signal(AppScope, ({ scope }) => scope.label);
 * ```
 */
export function signal<TToken extends AnyScopeToken, TValue>(
  scopeToken: TToken,
  initialValue: TValue | ((params: ScopedParams<TToken>) => TValue),
  options?: SignalOptions<TToken, TValue>,
): SignalHandle<TValue, TToken> {
  return createScopedHandle("signal", scopeToken, (scopeNode, chain) => {
    const nextValue =
      typeof initialValue === "function"
        ? (initialValue as (params: ScopedParams<TToken>) => TValue)(
            createScopedParams(scopeNode),
          )
        : initialValue;

    const targetAtom = atom(nextValue);
    const onMount = options?.onMount;
    if (onMount != null) {
      targetAtom.onMount = (setValue): DestructorFn | undefined =>
        onMount(
          (update) => {
            setValue(update);
          },
          createReactiveScope(scopeToken, chain, scopeNode),
        ) ?? undefined;
    }

    return targetAtom;
  }) as SignalHandle<TValue, TToken>;
}

/**
 * Creates keyed scoped state and derived values cached per key within the owning scope instance.
 *
 * @param scopeToken Scope token that owns the family.
 * @param create Factory called once per unique key within the scope instance.
 * @param create.key Current family key being resolved.
 * @param create.helpers.derived Helper for creating keyed derived values inside the family member.
 * @param create.helpers.family Helper for creating nested keyed families scoped to the current family member.
 * @param create.helpers.get Helper for reading scoped values and keyed families visible from the owning scope instance.
 * @param create.helpers.signal Helper for creating keyed writable signals inside the family member.
 * @param create.helpers.scope Full visible scope context for the owning scope instance.
 * @example
 * ```ts
 * const todoById = family(AppScope, (todoId: string, { derived, signal }) => {
 *   const title$ = signal("");
 *   const completed$ = signal(false);
 *   const summary$ = derived((get) => `${todoId}:${get(title$)}`);
 *
 *   return { completed$, summary$, title$ };
 * });
 * ```
 */
export function family<TToken extends AnyScopeToken, TKey, TValue>(
  scopeToken: TToken,
  create: (
    key: TKey,
    helpers: {
      derived: ReturnType<
        typeof createKeyedFamilyHelpers<TToken, TKey>
      >["derived"];
      family: ReturnType<
        typeof createKeyedFamilyHelpers<TToken, TKey>
      >["family"];
      get: ReturnType<typeof createKeyedFamilyHelpers<TToken, TKey>>["get"];
      signal: ReturnType<
        typeof createKeyedFamilyHelpers<TToken, TKey>
      >["signal"];
      scope: ScopeValuesForToken<TToken>;
    },
  ) => TValue,
): FamilyHandle<TKey, TValue, TToken> {
  const handle: FamilyHandle<TKey, TValue, TToken> = {
    resolve(scopeNode, chain, key) {
      const targetNode =
        scopeNode.token === scopeToken
          ? scopeNode
          : resolveScopeNodeFromContext(scopeNode, chain, scopeToken);
      let keyBindings = targetNode.familyBindings.get(handle);
      if (keyBindings == null) {
        keyBindings = new Map();
        targetNode.familyBindings.set(handle, keyBindings);
      }

      const cached = keyBindings.get(key);
      if (cached !== undefined) {
        return cached as TValue;
      }

      const scope = createScopeContextSnapshot(
        targetNode,
      ) as ScopeValuesForToken<TToken>;
      const familyHelpers = createKeyedFamilyHelpers(
        targetNode,
        chain,
        scope,
        key,
      );
      const created = create(key, {
        derived: familyHelpers.derived,
        family: familyHelpers.family,
        get: familyHelpers.get,
        signal: familyHelpers.signal,
        scope,
      });
      keyBindings.set(key, created);
      return created;
    },
    scope: scopeToken,
  };

  return handle;
}

/**
 * Creates a derived scoped value that recomputes from other Maitai values and scope context.
 *
 * @param scopeToken Scope token that owns the derived value.
 * @param readValue Function that reads scoped state, keyed families, and scope context to compute the derived value.
 * @param readValue.params.get Reads another scoped value, family value, or keyed family member.
 * @param readValue.params.scope Full visible scope context for the mounted scope instance.
 * @example
 * ```ts
 * const reviewSummary$ = derived(ReviewScope, ({ get, scope }) => {
 *   return `${scope.reviewId}:${get(reviewCount$)}`;
 * });
 * ```
 */
export function derived<TToken extends AnyScopeToken, TValue>(
  scopeToken: TToken,
  readValue: (params: ReadParams<TToken>) => TValue,
): ValueHandle<TValue, TToken> {
  return createScopedHandle("cached", scopeToken, (scopeNode, chain) =>
    atom((get) => {
      readScopeContextVersions(scopeNode, get);

      return readValue(createReadParams(chain, scopeNode, get));
    }),
  ) as ValueHandle<TValue, TToken>;
}

/**
 * Creates a TanStack Query-backed value that reads scope context and other Maitai values.
 *
 * @param scopeToken Scope token that owns the query value.
 * @param getOptions Function that returns TanStack Query observer options for the current scope instance.
 * @param getOptions.params.get Reads another scoped value, family value, or keyed family member.
 * @param getOptions.params.scope Full visible scope context for the mounted scope instance.
 * @example
 * ```ts
 * const reviewQuery$ = querySignal(ReviewScope, ({ scope }) => ({
 *   queryFn: async () => fetchReview(scope.reviewId),
 *   queryKey: ["review", scope.reviewId],
 *   staleTime: 60_000,
 * }));
 * ```
 *
 * `querySignal` defaults `refetchOnMount` to `false` because it is built on `jotai-tanstack-query`’s `atomWithQuery`,
 * which creates a dynamic inner result atom and can resubscribe the TanStack `QueryObserver` during normal reactive updates.
 * With TanStack’s default `refetchOnMount: true`, a finite-stale query can accidentally refetch every time it becomes stale,
 * since that internal resubscribe looks like a fresh mount.
 *
 * As a result, refetchOnMount is disabled. Callers should manually refetch on mount if needed.
 * https://github.com/jotaijs/jotai-tanstack-query/blob/06759979819e482dc2f7b26eab8e0e4243eb587e/src/baseAtomWithQuery.ts#L98
 */
export function querySignal<
  TToken extends AnyScopeToken,
  TQueryFnData,
  TError = Error,
  TData = TQueryFnData,
  TQueryKey extends QueryKey = QueryKey,
>(
  scopeToken: TToken,
  getOptions: (
    params: ReadParams<TToken>,
  ) => QueryObserverOptions<
    TQueryFnData,
    TError,
    TData,
    TQueryFnData,
    TQueryKey
  >,
): ValueHandle<QueryObserverResult<TData, TError>, TToken> {
  return createScopedHandle("cached", scopeToken, (scopeNode, chain) => {
    if (scopeNode.queryClient == null) {
      throw new Error("querySignal requires a QueryClient on Scope");
    }

    return atomWithQuery(
      (get) => {
        readScopeContextVersions(scopeNode, get);
        const queryOptions = getOptions(
          createReadParams(chain, scopeNode, get),
        );

        return {
          ...queryOptions,
          refetchOnMount: false,
        };
      },
      () => scopeNode.queryClient!,
    );
  }) as ValueHandle<QueryObserverResult<TData, TError>, TToken>;
}

/**
 * Creates a mutation value that reads scope context and other Maitai values.
 *
 * @param scopeToken Scope token that owns the mutation value.
 * @param getOptions Function that returns TanStack Mutation observer options for the current scope instance.
 * @param getOptions.params.get Reads another scoped value, family value, or keyed family member.
 * @param getOptions.params.scope Full visible scope context for the mounted scope instance.
 * @example
 * ```ts
 * const saveReview$ = mutationSignal(ReviewScope, ({ scope }) => ({
 *   mutationFn: async (title: string) => updateReview(scope.reviewId, title),
 *   mutationKey: ["save-review", scope.reviewId],
 * }));
 * ```
 */
export function mutationSignal<
  TToken extends AnyScopeToken,
  TData = unknown,
  TVariables = void,
  TError = unknown,
  TContext = unknown,
>(
  scopeToken: TToken,
  getOptions: (
    params: ReadParams<TToken>,
  ) => MutationObserverOptions<TData, TError, TVariables, TContext>,
): ValueHandle<MutationSignalResult<TData, TError, TVariables>, TToken> {
  return createScopedHandle("cached", scopeToken, (scopeNode, chain) => {
    if (scopeNode.queryClient == null) {
      throw new Error("mutationSignal requires a QueryClient on Scope");
    }

    const stateAtom = atom<{
      data: TData | undefined;
      error: TError | null;
      status: "idle" | "pending" | "success" | "error";
      variables: TVariables | undefined;
    }>({
      data: undefined,
      error: null,
      status: "idle",
      variables: undefined,
    });

    return atom((get) => {
      readScopeContextVersions(scopeNode, get);
      const state = get(stateAtom);
      const getCurrentOptions = (): MutationObserverOptions<
        TData,
        TError,
        TVariables,
        TContext
      > => {
        return getOptions(
          createReadParams(chain, scopeNode, scopeNode.store.get),
        );
      };

      const mutateAsync = async (variables: TVariables): Promise<TData> => {
        const options = getCurrentOptions();
        const context: MutationFunctionContext = {
          client: scopeNode.queryClient!,
          meta: options.meta,
          mutationKey: options.mutationKey,
        };

        scopeNode.store.set(stateAtom, {
          data: undefined,
          error: null,
          status: "pending",
          variables,
        });

        try {
          const onMutateResult = await options.onMutate?.(variables, context);
          const data = await options.mutationFn?.(variables, context);
          scopeNode.store.set(stateAtom, {
            data: data as TData,
            error: null,
            status: "success",
            variables,
          });
          await options.onSuccess?.(
            data as TData,
            variables,
            onMutateResult as TContext,
            context,
          );
          await options.onSettled?.(
            data as TData,
            null,
            variables,
            onMutateResult as TContext,
            context,
          );
          return data as TData;
        } catch (error) {
          scopeNode.store.set(stateAtom, {
            data: undefined,
            error: error as TError,
            status: "error",
            variables,
          });
          await options.onError?.(
            error as TError,
            variables,
            undefined,
            context,
          );
          await options.onSettled?.(
            undefined,
            error as TError,
            variables,
            undefined,
            context,
          );
          throw error;
        }
      };

      return {
        ...state,
        isError: state.status === "error",
        isIdle: state.status === "idle",
        isPending: state.status === "pending",
        isSuccess: state.status === "success",
        mutate: (variables: TVariables): void => {
          void mutateAsync(variables);
        },
        mutateAsync,
      };
    });
  }) as ValueHandle<MutationSignalResult<TData, TError, TVariables>, TToken>;
}

/**
 * Imperatively reads a scoped signal, derived value, or query result from a scope instance.
 *
 * @param scopeContext Mounted scope instance returned by `useScope(...)`.
 * @param handle Scoped value handle to read.
 * @example
 * ```ts
 * const reviewScope = useScope(ReviewScope);
 * const summary = reviewScope.get(reviewSummary$);
 * ```
 */
export function get<
  TScope extends AnyScopeToken,
  THandle extends ScopedHandle<unknown, AnyScopeToken>,
>(
  scopeContext: Scope<TScope>,
  handle: THandle &
    IsValueHandle<THandle> &
    (IsScopeReachableFrom<TScope, HandleScope<THandle>> extends true
      ? unknown
      : never),
): HandleValue<THandle>;
export function get<TScope extends AnyScopeToken, T>(
  scopeContext: Scope<TScope>,
  handle: FamilyValue<T>,
): T;
export function get<
  TScope extends AnyScopeToken,
  TKey,
  TValue,
  TTarget extends AnyScopeToken,
>(
  scopeContext: Scope<TScope>,
  handle: FamilyHandle<TKey, TValue, TTarget> &
    (IsScopeReachableFrom<TScope, TTarget> extends true ? unknown : never),
  key: TKey,
): TValue;
export function get(
  scopeContext: Scope<AnyScopeToken>,
  handle:
    | ScopedHandle<unknown, AnyScopeToken>
    | FamilyHandle<unknown, unknown, AnyScopeToken>
    | FamilyValue<unknown>,
  key?: unknown,
): unknown {
  if (key !== undefined || arguments.length === 3) {
    const familyHandle = handle as FamilyHandle<
      unknown,
      unknown,
      AnyScopeToken
    >;
    const targetNode = resolveScopeNodeFromContext(
      scopeContext.node,
      scopeContext.chain,
      familyHandle.scope,
    );
    return familyHandle.resolve(targetNode, scopeContext.chain, key);
  }

  if ("store" in handle) {
    return handle.get();
  }

  const valueHandle = handle as ScopedHandle<Atom<unknown>, AnyScopeToken>;
  const targetNode = resolveScopeNodeFromContext(
    scopeContext.node,
    scopeContext.chain,
    valueHandle.scope,
  );
  return targetNode.store.get(
    valueHandle.resolve(targetNode, scopeContext.chain),
  );
}

/**
 * Imperatively observes scoped reads and writes from a scope instance.
 *
 * @param scopeContext Mounted scope instance returned by `useScope(...)`.
 * @param callback Observer body that tracks reads and reruns when those reads change.
 * @example
 * ```ts
 * const stopWatching = appScope.watch(({ get }) => {
 *   const metrics = get(reviewMetricsById, "review-1");
 *   console.log(get(metrics.summary$));
 *   return;
 * });
 * ```
 */
export function watch<TScope extends AnyScopeToken>(
  scopeContext: Scope<TScope>,
  callback: WatchCallback<TScope>,
): DestructorFn {
  return observe((get) => {
    return callback(
      createReactiveScope(
        scopeContext.scope,
        scopeContext.chain,
        scopeContext.node,
        get,
      ),
    );
  }, scopeContext.node.store);
}

export function set<
  TScope extends AnyScopeToken,
  THandle extends ScopedHandle<unknown, AnyScopeToken>,
>(
  scopeContext: Scope<TScope>,
  handle: THandle &
    IsSignalHandle<THandle> &
    (IsScopeReachableFrom<TScope, HandleScope<THandle>> extends true
      ? unknown
      : never),
  update: HandleSignalValue<THandle> | UpdateFn<HandleSignalValue<THandle>>,
): void;
export function set<TScope extends AnyScopeToken, TValue>(
  scopeContext: Scope<TScope>,
  handle: FamilySignal<TValue>,
  update: TValue | UpdateFn<TValue>,
): void;
/**
 * Imperatively writes to a scoped signal or resolved family signal from a scope instance.
 *
 * @param scopeContext Mounted scope instance returned by `useScope(...)`.
 * @param handle Scoped signal handle or resolved family signal to update.
 * @param update Next value or updater function.
 * @example
 * ```ts
 * const reviewScope = useScope(ReviewScope);
 * reviewScope.set(reviewCount$, (value) => value + 1);
 *
 * const metrics = reviewScope.get(reviewMetricsById, "review-1");
 * reviewScope.set(metrics.count$, 3);
 * ```
 */
export function set<
  TScope extends AnyScopeToken,
  THandle extends ScopedHandle<unknown, AnyScopeToken>,
>(
  scopeContext: Scope<TScope>,
  handle:
    | (THandle &
        IsSignalHandle<THandle> &
        (IsScopeReachableFrom<TScope, HandleScope<THandle>> extends true
          ? unknown
          : never))
    | FamilySignal<unknown>,
  update: unknown,
): void {
  if (isFamilySignal(handle)) {
    setSignalValue(handle.store, handle.atom, update);
    return;
  }

  const targetNode = resolveScopeNodeFromContext(
    scopeContext.node,
    scopeContext.chain,
    handle.scope,
  );
  setSignalValue(
    targetNode.store,
    handle.resolve(targetNode, scopeContext.chain) as PrimitiveAtom<unknown>,
    update as never,
  );
}
