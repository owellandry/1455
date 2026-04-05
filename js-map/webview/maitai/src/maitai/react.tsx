import type { QueryClient } from "@tanstack/query-core";
import { atom, createStore, type Atom } from "jotai/vanilla";
import isEqual from "lodash/isEqual";
import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
} from "react";

import { set, watch } from "./primitives";
import {
  createScopeContextSnapshot,
  createDeclaredChain,
  isFamilyValue,
  resolveScopeNodeFromChain,
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
  Scope,
  ScopeChain,
  ScopeValueObject,
  ScopeValuesForToken,
  ScopeFrame,
  ScopeNode,
  ScopeToken,
  ScopedHandle,
  ValueHandle,
  WatchCallback,
} from "./types";

const ScopeChainContext = createContext<ScopeChain>(new Map());
const QueryClientContext = createContext<QueryClient | undefined>(undefined);
const emptyScopeValue = {};

type ScopeProps<TValue extends ScopeValueObject> = {
  children: ReactNode;
  scope: ScopeToken<string, TValue, AnyScopeToken | undefined>;
} & (keyof TValue extends never ? { value?: TValue } : { value: TValue });

/**
 * Provides Maitai-wide services shared across mounted scopes.
 *
 * @param children Descendant React tree that should render with Maitai services available.
 * @param queryClient Optional TanStack Query client inherited by `querySignal(...)` values in descendant scopes.
 */
export function MaitaiProvider({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient?: QueryClient;
}): ReactElement {
  return (
    <QueryClientContext.Provider value={queryClient}>
      {children}
    </QueryClientContext.Provider>
  );
}

/**
 * Mounts a scope instance and makes its declared context, state, query client, and effects available to descendants.
 *
 * @param children Descendant React tree that should render inside this scope instance.
 * @param scope Scope token that identifies which scope is being mounted.
 * @param value Scope value for this mounted instance. Scope values must be JSON-serializable objects. Empty scopes can omit this prop.
 * @example
 * ```tsx
 * <MaitaiProvider queryClient={queryClient}>
 *   <ScopeProvider scope={AppScope} value={{ label: "alpha" }}>
 *     <ScopeProvider scope={ReviewScope} value={{ reviewId: "review-1" }}>
 *       <ReviewPage />
 *     </ScopeProvider>
 *   </ScopeProvider>
 * </MaitaiProvider>
 * ```
 */
export function ScopeProvider<TValue extends ScopeValueObject>({
  children,
  scope,
  value,
}: ScopeProps<TValue>): ReactElement {
  const parentChain = useContext(ScopeChainContext);
  const queryClient = useContext(QueryClientContext);
  const parentScope =
    scope.parent == null ? undefined : parentChain.get(scope.parent.id);
  const providedValue = (value ?? emptyScopeValue) as TValue;
  const scopeKey =
    scope.getKey == null
      ? JSON.stringify(providedValue)
      : scope.getKey(providedValue);
  const current = useContextNode<TValue>();
  const pendingContextVersionBumpRef = useRef<{
    atom: ScopeNode<TValue>["contextVersionAtom"];
    store: ScopeNode<TValue>["store"];
  } | null>(null);

  if (scope.parent != null && parentScope == null) {
    throw new Error("Missing parent scope");
  }

  if (
    current.current == null ||
    current.current.node.token !== scope ||
    !Object.is(current.current.node.key, scopeKey) ||
    current.current.parent !== parentScope
  ) {
    const store = parentScope?.store ?? createStore();
    const node: ScopeNode<TValue> = {
      cachedBindings: new Map(),
      contextVersionAtom: atom(0),
      familyBindings: new Map(),
      key: scopeKey,
      parent: parentScope,
      queryClient: parentScope?.queryClient ?? queryClient,
      signalBindings: new Map(),
      store,
      token: scope,
      value: providedValue,
    };
    const chain = createDeclaredChain(parentChain, scope);
    chain.set(scope.id, node as ScopeNode<ScopeValueObject>);
    current.current = {
      chain,
      node,
      parent: parentScope,
    };
  } else {
    const chain = createDeclaredChain(parentChain, scope);
    chain.set(scope.id, current.current.node as ScopeNode<ScopeValueObject>);
    current.current.chain = chain;
    const didScopeValueChange = !isEqual(
      current.current.node.value,
      providedValue,
    );
    current.current.node.queryClient = parentScope?.queryClient ?? queryClient;
    current.current.node.value = providedValue;
    if (didScopeValueChange) {
      current.current.node.cachedBindings.clear();
      pendingContextVersionBumpRef.current = {
        atom: current.current.node.contextVersionAtom,
        store: current.current.node.store,
      };
    } else {
      pendingContextVersionBumpRef.current = null;
    }
  }

  useLayoutEffect(() => {
    const pendingContextVersionBump = pendingContextVersionBumpRef.current;
    if (pendingContextVersionBump == null) {
      return;
    }

    pendingContextVersionBump.store.set(
      pendingContextVersionBump.atom,
      (version) => version + 1,
    );
    pendingContextVersionBumpRef.current = null;
  });

  return (
    <ScopeChainContext.Provider value={current.current.chain}>
      {children}
    </ScopeChainContext.Provider>
  );
}

/**
 * Subscribes a component to a scoped or family value and rerenders when it changes.
 *
 * @param handle Scoped value handle or resolved family value to subscribe to.
 * @example
 * ```tsx
 * function ReviewSummary() {
 *   const summary = useSignal(reviewSummary$);
 *   return <div>{summary}</div>;
 * }
 * ```
 */
export function useSignal<TValue>(
  handle: ValueHandle<TValue> | FamilyValue<TValue>,
): TValue {
  if (isFamilyValue(handle)) {
    return useSyncExternalStore(
      (onStoreChange) => handle.subscribe(onStoreChange),
      () => handle.get(),
      () => handle.get(),
    );
  }

  const chain = useContext(ScopeChainContext);
  const scopeNode = resolveScopeNodeFromChain(chain, handle.scope);
  const resolved = handle.resolve(scopeNode, chain);

  return useSyncExternalStore(
    (onStoreChange) => scopeNode.store.sub(resolved, onStoreChange),
    () => scopeNode.store.get(resolved),
    () => scopeNode.store.get(resolved),
  );
}

/**
 * Resolves a keyed family member for the current component render.
 *
 * @param handle Family handle to resolve.
 * @param key Family key for the member you want to use.
 * @example
 * ```tsx
 * function ReviewRow({ reviewId }: { reviewId: string }) {
 *   const metrics = useFamily(reviewMetricsById, reviewId);
 *   const summary = useSignal(metrics.summary$);
 *   return <div>{summary}</div>;
 * }
 * ```
 */
export function useFamily<TKey, TValue, TScope extends AnyScopeToken>(
  handle: FamilyHandle<TKey, TValue, TScope>,
  key: TKey,
): TValue {
  const chain = useContext(ScopeChainContext);
  const scopeNode = resolveScopeNodeFromChain(chain, handle.scope);
  return handle.resolve(scopeNode, chain, key);
}

/**
 * Convenience to get the value from a family that returns a signal.
 *
 * Shorthand for `useSignal(useFamily(family$, key))`.
 *
 * @param family Family handle whose resolved member is a scoped or family value.
 * @param key Family key for the member you want to subscribe to.
 * @example
 * ```tsx
 * function ReviewSummaryRow({ reviewId }: { reviewId: string }) {
 *   const summary = useFamilySignal(reviewSummaryById$, reviewId);
 *   return <div>{summary}</div>;
 * }
 * ```
 */
export function useFamilySignal<TKey, TValue, TScope extends AnyScopeToken>(
  family: FamilyHandle<TKey, ValueHandle<TValue, TScope>, TScope>,
  key: TKey,
): TValue;
export function useFamilySignal<TKey, TValue, TScope extends AnyScopeToken>(
  family: FamilyHandle<TKey, FamilyValue<TValue>, TScope>,
  key: TKey,
): TValue;
export function useFamilySignal<TKey, TValue, TScope extends AnyScopeToken>(
  family: FamilyHandle<
    TKey,
    ValueHandle<TValue, TScope> | FamilyValue<TValue>,
    TScope
  >,
  key: TKey,
): TValue {
  return useSignal(useFamily(family, key));
}

/**
 * Resolves the mounted scope instance for imperative reads, family access, writes, and watches.
 *
 * @param scopeToken Scope token for the mounted scope instance you want to access.
 * @returns Scope instance with `get(...)`, `set(...)`, and `watch(...)` helpers.
 * @example
 * ```tsx
 * function ReviewToolbar() {
 *   const reviewScope = useScope(ReviewScope);
 *
 *   return (
 *     <button onClick={() => incrementReview(reviewScope)} type="button">
 *       Increment
 *     </button>
 *   );
 * }
 * ```
 */
export function useScope<TToken extends AnyScopeToken>(
  scopeToken: TToken,
): Scope<TToken> {
  const chain = useContext(ScopeChainContext);
  const node = resolveScopeNodeFromChain(chain, scopeToken);
  const value = createScopeContextSnapshot(node) as ScopeValuesForToken<TToken>;
  const scopeContextRef = useRef<Scope<TToken> | null>(null);

  if (
    scopeContextRef.current == null ||
    scopeContextRef.current.node !== node
  ) {
    const scopeContext = {
      chain,
      node,
      get queryClient() {
        if (node.queryClient == null) {
          throw new Error("Missing query client");
        }

        return node.queryClient;
      },
      scope: scopeToken,
      value,
    } as Scope<TToken>;

    function getFromScope<THandle extends ScopedHandle<unknown, AnyScopeToken>>(
      handle: THandle &
        IsValueHandle<THandle> &
        (IsScopeReachableFrom<TToken, HandleScope<THandle>> extends true
          ? unknown
          : never),
    ): HandleValue<THandle>;
    function getFromScope<TKey, TValue, TTarget extends AnyScopeToken>(
      handle: FamilyHandle<TKey, TValue, TTarget> &
        (IsScopeReachableFrom<TToken, TTarget> extends true ? unknown : never),
      key: TKey,
    ): TValue;
    function getFromScope(
      handle:
        | ScopedHandle<unknown, AnyScopeToken>
        | FamilyHandle<unknown, unknown, AnyScopeToken>,
      key?: unknown,
    ): unknown {
      if (key !== undefined || arguments.length === 2) {
        const familyHandle = handle as FamilyHandle<
          unknown,
          unknown,
          AnyScopeToken
        >;
        const targetNode = resolveScopeNodeFromChain(
          scopeContext.chain,
          familyHandle.scope,
        );
        return familyHandle.resolve(targetNode, scopeContext.chain, key);
      }

      const valueHandle = handle as ScopedHandle<unknown, AnyScopeToken>;
      const targetNode = resolveScopeNodeFromChain(
        scopeContext.chain,
        valueHandle.scope,
      );
      return targetNode.store.get(
        valueHandle.resolve(targetNode, scopeContext.chain) as Atom<unknown>,
      );
    }

    function watchFromScope(callback: WatchCallback<TToken>): DestructorFn {
      return watch(scopeContext, callback);
    }

    function setFromScope<THandle extends ScopedHandle<unknown, AnyScopeToken>>(
      handle: THandle &
        IsSignalHandle<THandle> &
        (IsScopeReachableFrom<TToken, HandleScope<THandle>> extends true
          ? unknown
          : never),
      update: HandleSignalValue<THandle>,
    ): void;
    function setFromScope<THandle extends ScopedHandle<unknown, AnyScopeToken>>(
      handle: THandle &
        IsSignalHandle<THandle> &
        (IsScopeReachableFrom<TToken, HandleScope<THandle>> extends true
          ? unknown
          : never),
      update:
        | HandleSignalValue<THandle>
        | ((value: HandleSignalValue<THandle>) => HandleSignalValue<THandle>),
    ): void;
    function setFromScope<TValue>(
      handle: FamilySignal<TValue>,
      update: TValue | ((value: TValue) => TValue),
    ): void;
    function setFromScope(
      handle: ScopedHandle<unknown, AnyScopeToken> | FamilySignal<unknown>,
      update: unknown,
    ): void {
      set(scopeContext, handle as never, update as never);
    }

    scopeContext.get = getFromScope;
    scopeContext.set = setFromScope;
    scopeContext.watch = watchFromScope;
    scopeContextRef.current = scopeContext;
  } else {
    scopeContextRef.current.chain = chain;
    scopeContextRef.current.value = value;
  }

  return scopeContextRef.current;
}

function useContextNode<TValue extends ScopeValueObject>(): {
  current: ScopeFrame<TValue> | null;
} {
  return useRef<ScopeFrame<TValue> | null>(null);
}
