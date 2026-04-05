import { queryClientAtom } from './_queryClientAtom.js';
export { queryClientAtom } from './_queryClientAtom.js';
import { notifyManager, QueryObserver, InfiniteQueryObserver, MutationObserver } from '@tanstack/query-core';
import { atom } from 'jotai';

const shouldSuspend = (defaultedOptions, result, isRestoring)=>defaultedOptions?.suspense && willFetch(result);
const willFetch = (result, isRestoring)=>result.isPending && true;
const getHasError = ({ result, throwOnError, query })=>{
    return result.isError && !result.isFetching && shouldThrowError(throwOnError, [
        result.error,
        query
    ]);
};
function shouldThrowError(throwOnError, params) {
    // Allow useErrorBoundary function to override throwing behavior on a per-error basis
    if (typeof throwOnError === 'function') {
        return throwOnError(...params);
    }
    return !!throwOnError;
}
const defaultThrowOnError = (_error, query)=>typeof query.state.data === 'undefined';
const ensureStaleTime = (defaultedOptions)=>{
    if (defaultedOptions.suspense) {
        if (typeof defaultedOptions.staleTime !== 'number') {
            return {
                ...defaultedOptions,
                staleTime: 1000
            };
        }
    }
    return defaultedOptions;
};

function baseAtomWithQuery(getOptions, Observer, getQueryClient = (get)=>get(queryClientAtom)) {
    const refreshAtom = atom(0);
    const clientAtom = atom(getQueryClient);
    if (process.env.NODE_ENV !== 'production') {
        clientAtom.debugPrivate = true;
    }
    const observerCacheAtom = atom(()=>new WeakMap());
    if (process.env.NODE_ENV !== 'production') {
        observerCacheAtom.debugPrivate = true;
    }
    const defaultedOptionsAtom = atom((get)=>{
        const client = get(clientAtom);
        const options = getOptions(get);
        const defaultedOptions = client.defaultQueryOptions(options);
        const cache = get(observerCacheAtom);
        const cachedObserver = cache.get(client);
        defaultedOptions._optimisticResults = 'optimistic';
        if (cachedObserver) {
            cachedObserver.setOptions(defaultedOptions);
        }
        return ensureStaleTime(defaultedOptions);
    });
    if (process.env.NODE_ENV !== 'production') {
        defaultedOptionsAtom.debugPrivate = true;
    }
    const observerAtom = atom((get)=>{
        const client = get(clientAtom);
        const defaultedOptions = get(defaultedOptionsAtom);
        const observerCache = get(observerCacheAtom);
        const cachedObserver = observerCache.get(client);
        if (cachedObserver) return cachedObserver;
        const newObserver = new Observer(client, defaultedOptions);
        observerCache.set(client, newObserver);
        return newObserver;
    });
    if (process.env.NODE_ENV !== 'production') {
        observerAtom.debugPrivate = true;
    }
    const dataAtom = atom((get)=>{
        const observer = get(observerAtom);
        const defaultedOptions = get(defaultedOptionsAtom);
        const result = observer.getOptimisticResult(defaultedOptions);
        const resultAtom = atom(result);
        if (process.env.NODE_ENV !== 'production') {
            resultAtom.debugPrivate = true;
        }
        resultAtom.onMount = (set)=>{
            const unsubscribe = observer.subscribe(notifyManager.batchCalls(set));
            return ()=>{
                if (observer.getCurrentResult().isError) {
                    observer.getCurrentQuery().reset();
                }
                unsubscribe();
            };
        };
        return resultAtom;
    });
    if (process.env.NODE_ENV !== 'production') {
        dataAtom.debugPrivate = true;
    }
    return atom((get)=>{
        get(refreshAtom);
        const observer = get(observerAtom);
        const defaultedOptions = get(defaultedOptionsAtom);
        const result = get(get(dataAtom));
        if (shouldSuspend(defaultedOptions, result)) {
            return observer.fetchOptimistic(defaultedOptions);
        }
        if (getHasError({
            result,
            query: observer.getCurrentQuery(),
            throwOnError: defaultedOptions.throwOnError
        })) {
            throw result.error;
        }
        return result;
    }, (_get, set)=>{
        set(refreshAtom, (c)=>c + 1);
    });
}

function atomWithQuery(getOptions, getQueryClient = (get)=>get(queryClientAtom)) {
    return baseAtomWithQuery(getOptions, QueryObserver, getQueryClient);
}

function atomWithQueries({ queries, combine }, getQueryClient = (get)=>get(queryClientAtom)) {
    if (!combine) {
        return queries.map((getOptions)=>baseAtomWithQuery(getOptions, QueryObserver, getQueryClient));
    }
    const queryAtoms = queries.map((getOptions)=>baseAtomWithQuery(getOptions, QueryObserver, getQueryClient));
    return atom((get)=>{
        const results = queryAtoms.map((queryAtom)=>{
            const result = get(queryAtom);
            return result;
        });
        return combine(results);
    });
}

function atomWithSuspenseQuery(getOptions, getQueryClient = (get)=>get(queryClientAtom)) {
    const suspenseOptions = atom((get)=>{
        const options = getOptions(get);
        return {
            ...options,
            suspense: true,
            enabled: true,
            throwOnError: defaultThrowOnError
        };
    });
    return baseAtomWithQuery((get)=>get(suspenseOptions), QueryObserver, getQueryClient);
}

function atomWithInfiniteQuery(getOptions, getQueryClient = (get)=>get(queryClientAtom)) {
    return baseAtomWithQuery(getOptions, InfiniteQueryObserver, getQueryClient);
}

function atomWithMutation(getOptions, getQueryClient = (get)=>get(queryClientAtom)) {
    const IN_RENDER = Symbol();
    const optionsAtom = atom((get)=>{
        const client = getQueryClient(get);
        const options = getOptions(get);
        return client.defaultMutationOptions(options);
    });
    if (process.env.NODE_ENV !== 'production') {
        optionsAtom.debugPrivate = true;
    }
    const observerCacheAtom = atom(()=>new WeakMap());
    if (process.env.NODE_ENV !== 'production') {
        observerCacheAtom.debugPrivate = true;
    }
    const observerAtom = atom((get)=>{
        const options = get(optionsAtom);
        const client = getQueryClient(get);
        const observerCache = get(observerCacheAtom);
        const observer = observerCache.get(client);
        if (observer) {
            observer[IN_RENDER] = true;
            observer.setOptions(options);
            delete observer[IN_RENDER];
            return observer;
        }
        const newObserver = new MutationObserver(client, options);
        observerCache.set(client, newObserver);
        return newObserver;
    });
    if (process.env.NODE_ENV !== 'production') {
        observerAtom.debugPrivate = true;
    }
    const dataAtom = atom((get)=>{
        const observer = get(observerAtom);
        const currentResult = observer.getCurrentResult();
        const resultAtom = atom(currentResult);
        resultAtom.onMount = (set)=>{
            observer.subscribe(notifyManager.batchCalls(set));
            return ()=>{
                observer.reset();
            };
        };
        if (process.env.NODE_ENV !== 'production') {
            resultAtom.debugPrivate = true;
        }
        return resultAtom;
    });
    const mutateAtom = atom((get)=>{
        const observer = get(observerAtom);
        const mutate = (variables, options)=>{
            observer.mutate(variables, options).catch(noop);
        };
        return mutate;
    });
    if (process.env.NODE_ENV !== 'production') {
        mutateAtom.debugPrivate = true;
    }
    return atom((get)=>{
        const observer = get(observerAtom);
        const resultAtom = get(dataAtom);
        const result = get(resultAtom);
        const mutate = get(mutateAtom);
        if (result.isError && shouldThrowError(observer.options.throwOnError, [
            result.error
        ])) {
            throw result.error;
        }
        return {
            ...result,
            mutate,
            mutateAsync: result.mutate
        };
    });
}
function noop() {}

function atomWithSuspenseInfiniteQuery(getOptions, getQueryClient = (get)=>get(queryClientAtom)) {
    const suspenseOptionsAtom = atom((get)=>{
        const options = getOptions(get);
        return {
            ...options,
            enabled: true,
            suspense: true,
            throwOnError: defaultThrowOnError
        };
    });
    return baseAtomWithQuery((get)=>get(suspenseOptionsAtom), InfiniteQueryObserver, getQueryClient);
}

function getResult(mutationCache, options) {
    return mutationCache.findAll(options.filters).map((mutation)=>options.select ? options.select(mutation) : mutation.state);
}
const atomWithMutationState = (getOptions, getQueryClient = (get)=>get(queryClientAtom))=>{
    const resultsAtom = atom([]);
    if (process.env.NODE_ENV !== 'production') {
        resultsAtom.debugPrivate = true;
    }
    const observableAtom = atom((get)=>{
        const queryClient = getQueryClient(get);
        const mutationCache = queryClient.getMutationCache();
        resultsAtom.onMount = (set)=>{
            const unsubscribe = mutationCache.subscribe(()=>{
                set(getResult(getQueryClient(get).getMutationCache(), getOptions(get)));
            });
            return unsubscribe;
        };
    });
    if (process.env.NODE_ENV !== 'production') {
        observableAtom.debugPrivate = true;
    }
    return atom((get)=>{
        get(observableAtom);
        return get(resultsAtom);
    });
};

export { atomWithInfiniteQuery, atomWithMutation, atomWithMutationState, atomWithQueries, atomWithQuery, atomWithSuspenseInfiniteQuery, atomWithSuspenseQuery };
//# sourceMappingURL=index.js.map
