import { observe } from "jotai-effect";
import { atom, type Atom, type PrimitiveAtom } from "jotai/vanilla";

import type {
  AnyScopeToken,
  AtomReader,
  AtomStore,
  DestructorFn,
  FamilyDerivedFactory,
  FamilyHandle,
  FamilySignalOptions,
  FamilySignal,
  FamilySignalFactory,
  FamilyValue,
  Getter,
  HandleSignalValue,
  HandleScope,
  IsSignalHandle,
  IsScopeReachableFrom,
  NestedFamilyFactory,
  ReadParams,
  Scope,
  ScopeChain,
  ScopeValueObject,
  ScopeValuesForToken,
  ScopeNode,
  ScopedParams,
  ScopedHandle,
  Setter,
  UpdateFn,
  ValueHandle,
  WatchCallback,
} from "./types";

export function createScopedHandle<TResolved, TToken extends AnyScopeToken>(
  cache: ScopedHandle<TResolved, TToken>["cache"],
  scopeToken: TToken,
  create: (
    scopeNode: ScopeNode<ScopeValueObject>,
    chain: ScopeChain,
  ) => TResolved,
): ScopedHandle<TResolved, TToken> {
  const handle: ScopedHandle<TResolved, TToken> = {
    cache,
    resolve(scopeNode, chain) {
      const targetNode = resolveScopeNodeFromContext(
        scopeNode,
        chain,
        scopeToken,
      );
      const cacheMap =
        handle.cache === "signal"
          ? targetNode.signalBindings
          : targetNode.cachedBindings;
      const cached = cacheMap.get(handle);
      if (cached !== undefined) {
        return cached as TResolved;
      }

      const created = create(targetNode, chain);
      cacheMap.set(handle, created);
      return created;
    },
    scope: scopeToken,
  };

  return handle;
}

export function createGetter(
  chain: ScopeChain,
  scopeNode: ScopeNode<ScopeValueObject>,
  readAtom?: AtomReader,
): Getter<AnyScopeToken> {
  const reader: AtomReader =
    readAtom ??
    (<T>(targetAtom: Atom<T>): T => {
      return scopeNode.store.get(targetAtom);
    });

  return function <T>(
    handle: ValueHandle<T> | FamilyHandle<unknown, T> | FamilyValue<T>,
    key?: unknown,
  ): T {
    if (key !== undefined || arguments.length === 2) {
      const familyHandle = handle as FamilyHandle<unknown, T>;
      const targetNode = resolveScopeNodeFromContext(
        scopeNode,
        chain,
        familyHandle.scope,
      );
      return familyHandle.resolve(targetNode, chain, key);
    }

    if (isFamilyValue(handle)) {
      if (readAtom != null && handle.store === scopeNode.store) {
        return readAtom(handle.atom);
      }

      return handle.get();
    }

    const targetNode = resolveScopeNodeFromContext(
      scopeNode,
      chain,
      (handle as ValueHandle<T>).scope,
    );
    return reader((handle as ValueHandle<T>).resolve(targetNode, chain));
  } as Getter<AnyScopeToken>;
}

export function createSetter(
  chain: ScopeChain,
  scopeNode: ScopeNode<ScopeValueObject>,
): Setter<AnyScopeToken> {
  return (handle, update) => {
    const targetNode = resolveScopeNodeFromContext(
      scopeNode,
      chain,
      handle.scope,
    );
    setSignalValue(
      targetNode.store,
      handle.resolve(targetNode, chain) as PrimitiveAtom<
        HandleSignalValue<typeof handle>
      >,
      update,
    );
  };
}

export function createNestedFamilyFactory<TToken extends AnyScopeToken>(
  scopeNode: ScopeNode<ScopeValueObject>,
  chain: ScopeChain,
  scope: ScopeValuesForToken<TToken>,
): NestedFamilyFactory<TToken> {
  return (<TKey, TValue>(
    create: (
      key: TKey,
      helpers: {
        derived: FamilyDerivedFactory<TToken, TKey>;
        family: NestedFamilyFactory<TToken>;
        get: Getter<TToken>;
        signal: FamilySignalFactory<TToken, TKey>;
        scope: ScopeValuesForToken<TToken>;
      },
    ) => TValue,
  ) => {
    const keyBindings = new Map<unknown, unknown>();

    return (key: TKey): TValue => {
      const cached = keyBindings.get(key);
      if (cached !== undefined) {
        return cached as TValue;
      }

      const familyHelpers = createKeyedFamilyHelpers(
        scopeNode,
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
    };
  }) as NestedFamilyFactory<TToken>;
}

export function createKeyedFamilyHelpers<TToken extends AnyScopeToken, TKey>(
  scopeNode: ScopeNode<ScopeValueObject>,
  chain: ScopeChain,
  scope: ScopeValuesForToken<TToken>,
  key: TKey,
): {
  derived: FamilyDerivedFactory<TToken, TKey>;
  family: NestedFamilyFactory<TToken>;
  get: Getter<TToken>;
  signal: FamilySignalFactory<TToken, TKey>;
} {
  return {
    derived: <TValue>(
      readValue: (
        get: <T>(handle: FamilyValue<T>) => T,
        params: ScopedParams<TToken> & { key: TKey },
      ) => TValue,
    ): FamilyValue<TValue> =>
      createFamilyValue(
        scopeNode.store,
        atom((get) => {
          return readValue(
            (target) => get(target.atom),
            Object.assign(createScopedParams<TToken>(scopeNode), {
              key,
            }),
          );
        }),
      ),
    family: createNestedFamilyFactory<TToken>(scopeNode, chain, scope),
    get: createGetter(chain, scopeNode),
    signal: <TValue>(
      initialValue:
        | TValue
        | ((params: ScopedParams<TToken> & { key: TKey }) => TValue),
      options?: FamilySignalOptions<TToken, TKey, TValue>,
    ): FamilySignal<TValue> => {
      const resolved =
        typeof initialValue === "function"
          ? (
              initialValue as (
                params: ScopedParams<TToken> & { key: TKey },
              ) => TValue
            )(
              Object.assign(createScopedParams<TToken>(scopeNode), {
                key,
              }),
            )
          : initialValue;

      const targetAtom = atom(resolved);
      const onMount = options?.onMount;
      if (onMount != null) {
        targetAtom.onMount = (setValue): DestructorFn | undefined =>
          onMount(
            (update: TValue | UpdateFn<TValue>) => {
              setValue(update);
            },
            Object.assign(
              createReactiveScope(scopeNode.token as TToken, chain, scopeNode),
              {
                key,
              },
            ),
          ) ?? undefined;
      }

      return createFamilySignal(scopeNode.store, targetAtom);
    },
  };
}

export function createFamilySignal<TValue>(
  store: AtomStore,
  targetAtom: PrimitiveAtom<TValue>,
): FamilySignal<TValue> {
  return {
    atom: targetAtom,
    get() {
      return store.get(targetAtom);
    },
    set(update) {
      setSignalValue(store, targetAtom, update);
    },
    subscribe(callback) {
      return store.sub(targetAtom, callback);
    },
    store,
  };
}

export function createFamilyValue<TValue>(
  store: AtomStore,
  targetAtom: Atom<TValue>,
): FamilyValue<TValue> {
  return {
    atom: targetAtom,
    get() {
      return store.get(targetAtom);
    },
    subscribe(callback) {
      return store.sub(targetAtom, callback);
    },
    store,
  };
}

export function isFamilyValue<TValue>(
  target: unknown,
): target is FamilyValue<TValue> & { store: AtomStore } {
  return (
    typeof target === "object" &&
    target != null &&
    "atom" in target &&
    "store" in target
  );
}

export function isFamilySignal<TValue>(
  target: unknown,
): target is FamilySignal<TValue> & { store: AtomStore } {
  return isFamilyValue(target) && "set" in target;
}

export function createScopeContextSnapshot(
  scopeNode: ScopeNode<ScopeValueObject>,
): ScopeValueObject {
  return readScopeContext(scopeNode);
}

export function createScopedParams<TToken extends AnyScopeToken>(
  scopeNode: ScopeNode<ScopeValueObject>,
): ScopedParams<TToken> {
  return {
    get queryClient() {
      if (scopeNode.queryClient == null) {
        throw new Error("Missing query client");
      }

      return scopeNode.queryClient;
    },
    scope: createScopeContextSnapshot(scopeNode) as ScopeValuesForToken<TToken>,
  };
}

export function createReadParams<TToken extends AnyScopeToken>(
  chain: ScopeChain,
  scopeNode: ScopeNode<ScopeValueObject>,
  readAtom?: AtomReader,
): ReadParams<TToken> {
  return Object.assign(createScopedParams<TToken>(scopeNode), {
    get: createGetter(chain, scopeNode, readAtom),
  });
}

export function readScopeContextVersions(
  scopeNode: ScopeNode<ScopeValueObject>,
  readAtom: AtomReader,
): void {
  if (scopeNode.parent != null) {
    readScopeContextVersions(scopeNode.parent, readAtom);
  }

  readAtom(scopeNode.contextVersionAtom);
}

export function createDeclaredChain(
  parentChain: ScopeChain,
  scopeToken: AnyScopeToken,
): ScopeChain {
  const chain = new Map<symbol, ScopeNode<ScopeValueObject>>();
  let currentToken = scopeToken.parent as AnyScopeToken | undefined;

  while (currentToken != null) {
    const currentNode = parentChain.get(currentToken.id);
    if (currentNode == null) {
      break;
    }

    chain.set(currentToken.id, currentNode);
    currentToken = currentToken.parent as AnyScopeToken | undefined;
  }

  return chain;
}

export function resolveScopeNodeFromAncestors(
  scopeNode: ScopeNode<ScopeValueObject>,
  scopeToken: AnyScopeToken,
): ScopeNode<ScopeValueObject> {
  let current: ScopeNode<ScopeValueObject> | undefined = scopeNode;

  while (current != null) {
    if (current.token === scopeToken) {
      return current;
    }

    current = current.parent;
  }

  throw new Error("Missing scope instance");
}

export function resolveScopeNodeFromContext(
  scopeNode: ScopeNode<ScopeValueObject>,
  chain: ScopeChain,
  scopeToken: AnyScopeToken,
): ScopeNode<ScopeValueObject> {
  return (
    chain.get(scopeToken.id) ??
    resolveScopeNodeFromAncestors(scopeNode, scopeToken)
  );
}

export function resolveScopeNodeFromChain(
  chain: ScopeChain,
  scopeToken: AnyScopeToken,
): ScopeNode<ScopeValueObject> {
  const scopeNode = chain.get(scopeToken.id);
  if (scopeNode == null) {
    throw new Error("Missing scope instance");
  }

  return scopeNode;
}

export function setSignalValue<T>(
  store: AtomStore,
  targetAtom: PrimitiveAtom<T>,
  update: T | UpdateFn<T>,
): void {
  store.set(targetAtom, update);
}

export function createReactiveScope<TToken extends AnyScopeToken>(
  scopeToken: TToken,
  chain: ScopeChain,
  scopeNode: ScopeNode<ScopeValueObject>,
  readAtom?: AtomReader,
): Scope<TToken> {
  const nextScopeContext = {
    chain,
    get: createGetter(chain, scopeNode, readAtom),
    node: scopeNode,
    get queryClient() {
      if (scopeNode.queryClient == null) {
        throw new Error("Missing query client");
      }

      return scopeNode.queryClient;
    },
    scope: scopeToken,
    value: createScopeContextSnapshot(scopeNode) as ScopeValuesForToken<TToken>,
  } as Scope<TToken>;

  function setInScope<THandle extends ScopedHandle<unknown, AnyScopeToken>>(
    handle: THandle &
      IsSignalHandle<THandle> &
      (IsScopeReachableFrom<TToken, HandleScope<THandle>> extends true
        ? unknown
        : never),
    update: HandleSignalValue<THandle>,
  ): void;
  function setInScope<THandle extends ScopedHandle<unknown, AnyScopeToken>>(
    handle: THandle &
      IsSignalHandle<THandle> &
      (IsScopeReachableFrom<TToken, HandleScope<THandle>> extends true
        ? unknown
        : never),
    update: HandleSignalValue<THandle> | UpdateFn<HandleSignalValue<THandle>>,
  ): void;
  function setInScope<TValue>(
    handle: FamilySignal<TValue>,
    update: TValue | UpdateFn<TValue>,
  ): void;
  function setInScope(
    handle: ScopedHandle<unknown, AnyScopeToken> | FamilySignal<unknown>,
    update: unknown,
  ): void {
    if (isFamilySignal(handle)) {
      setSignalValue(handle.store, handle.atom, update);
      return;
    }

    createSetter(chain, scopeNode)(handle as never, update as never);
  }

  function watchInScope(run: WatchCallback<TToken>): DestructorFn {
    return observe((get) => {
      return run(createReactiveScope(scopeToken, chain, scopeNode, get));
    }, scopeNode.store);
  }

  nextScopeContext.set = setInScope as Scope<TToken>["set"];
  nextScopeContext.watch = watchInScope;
  return nextScopeContext;
}

function readScopeContext(
  scopeNode: ScopeNode<ScopeValueObject>,
): ScopeValueObject {
  const parentValue =
    scopeNode.parent == null ? undefined : readScopeContext(scopeNode.parent);

  return parentValue == null
    ? scopeNode.value
    : {
        ...parentValue,
        ...scopeNode.value,
      };
}
