export { queryClientAtom } from './_queryClientAtom.js';
import { DefaultError, QueryKey, WithRequired, QueryObserverOptions, QueryObserverResult, DefinedQueryObserverResult, InfiniteData, InfiniteQueryObserverOptions, InfiniteQueryObserverResult, DefinedInfiniteQueryObserverResult, MutationObserverResult, MutateFunction as MutateFunction$1, MutationObserverOptions, QueryClient, MutationOptions as MutationOptions$1, MutationState, MutationFilters, Mutation } from '@tanstack/query-core';
import * as jotai from 'jotai';
import { Getter, WritableAtom, Atom } from 'jotai';

type Override<A, B> = {
    [K in keyof A]: K extends keyof B ? B[K] : A[K];
};
type MutateFunction<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = (...args: Parameters<MutateFunction$1<TData, TError, TVariables, TContext>>) => void;
type MutateAsyncFunction<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = MutateFunction$1<TData, TError, TVariables, TContext>;
type AtomWithMutationResult<TData, TError, TVariables, TContext> = Override<MutationObserverResult<TData, TError, TVariables, TContext>, {
    mutate: MutateFunction<TData, TError, TVariables, TContext>;
}> & {
    mutateAsync: MutateAsyncFunction<TData, TError, TVariables, TContext>;
};
type MutationOptions<TData = unknown, TError = DefaultError, TVariables = void, TContext = unknown> = Omit<MutationObserverOptions<TData, TError, TVariables, TContext>, '_defaulted' | 'variables'>;
type BaseAtomWithQueryOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = WithRequired<QueryObserverOptions<TQueryFnData, TError, TData, TQueryData, TQueryKey>, 'queryKey'>;
type AtomWithQueryOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = Omit<WithRequired<BaseAtomWithQueryOptions<TQueryFnData, TError, TData, TQueryFnData, TQueryKey>, 'queryKey'>, 'suspense'>;
type AtomWithSuspenseQueryOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = Omit<AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryKey>, 'enabled' | 'throwOnError' | 'placeholderData'>;
type AtomWithInfiniteQueryOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = WithRequired<Omit<InfiniteQueryObserverOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'suspense'>, 'queryKey'>;
type AtomWithSuspenseInfiniteQueryOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = Omit<AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, 'enabled' | 'throwOnError' | 'placeholderData'>;
type AtomWithQueryResult<TData = unknown, TError = DefaultError> = QueryObserverResult<TData, TError>;
type DefinedAtomWithQueryResult<TData = unknown, TError = DefaultError> = DefinedQueryObserverResult<TData, TError>;
type AtomWithSuspenseQueryResult<TData = unknown, TError = DefaultError> = Omit<DefinedQueryObserverResult<TData, TError>, 'isPlaceholderData'> | Promise<Omit<DefinedQueryObserverResult<TData, TError>, 'isPlaceholderData'>>;
type AtomWithInfiniteQueryResult<TData = unknown, TError = DefaultError> = InfiniteQueryObserverResult<TData, TError>;
type DefinedAtomWithInfiniteQueryResult<TData = unknown, TError = DefaultError> = DefinedInfiniteQueryObserverResult<TData, TError>;
type AtomWithSuspenseInfiniteQueryResult<TData = unknown, TError = DefaultError> = Promise<Omit<DefinedInfiniteQueryObserverResult<TData, TError>, 'isPlaceholderData'>>;
type UndefinedInitialDataOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    initialData?: undefined;
};
type NonUndefinedGuard<T> = T extends undefined ? never : T;
type DefinedInitialDataOptions<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey> = AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryKey> & {
    initialData: NonUndefinedGuard<TQueryFnData> | (() => NonUndefinedGuard<TQueryFnData>);
};
type UndefinedInitialDataInfiniteOptions<TQueryFnData, TError = DefaultError, TData = InfiniteData<TQueryFnData>, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
    initialData?: undefined;
};
type DefinedInitialDataInfiniteOptions<TQueryFnData, TError = DefaultError, TData = InfiniteData<TQueryFnData>, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown> = AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam> & {
    initialData: NonUndefinedGuard<InfiniteData<TQueryFnData, TPageParam>> | (() => NonUndefinedGuard<InfiniteData<TQueryFnData, TPageParam>>);
};

declare function atomWithQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(getOptions: (get: Getter) => UndefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<AtomWithQueryResult<TData, TError>, [], void>;
declare function atomWithQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(getOptions: (get: Getter) => DefinedInitialDataOptions<TQueryFnData, TError, TData, TQueryKey>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<DefinedAtomWithQueryResult<TData, TError>, [], void>;
declare function atomWithQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(getOptions: (get: Getter) => AtomWithQueryOptions<TQueryFnData, TError, TData, TQueryKey>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<AtomWithQueryResult<TData, TError>, [], void>;

declare function atomWithQueries<TCombinedResult>({ queries, combine, }: {
    queries: Array<(get: Getter) => AtomWithQueryOptions>;
    combine: (results: AtomWithQueryResult[]) => TCombinedResult;
}, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<TCombinedResult, [], void>;
declare function atomWithQueries<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData>({ queries, }: {
    queries: Array<(get: Getter) => AtomWithQueryOptions>;
}, getQueryClient?: (get: Getter) => QueryClient): Array<WritableAtom<AtomWithQueryResult<TData, TError>, [], void>>;

declare function atomWithSuspenseQuery<TQueryFnData = unknown, TError = DefaultError, TData = TQueryFnData, TQueryKey extends QueryKey = QueryKey>(getOptions: (get: Getter) => AtomWithSuspenseQueryOptions<TQueryFnData, TError, TData, TQueryKey>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<AtomWithSuspenseQueryResult<TData, TError>, [], void>;

declare function atomWithInfiniteQuery<TQueryFnData, TError = DefaultError, TData = InfiniteData<TQueryFnData>, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(getOptions: (get: Getter) => UndefinedInitialDataInfiniteOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<AtomWithInfiniteQueryResult<TData, TError>, [], void>;
declare function atomWithInfiniteQuery<TQueryFnData, TError = DefaultError, TData = InfiniteData<TQueryFnData>, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(getOptions: (get: Getter) => DefinedInitialDataInfiniteOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<DefinedAtomWithInfiniteQueryResult<TData, TError>, [], void>;
declare function atomWithInfiniteQuery<TQueryFnData, TError = DefaultError, TData = InfiniteData<TQueryFnData>, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(getOptions: (get: Getter) => AtomWithInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<AtomWithInfiniteQueryResult<TData, TError>, [], void>;

declare function atomWithMutation<TData = unknown, TVariables = void, TError = unknown, TContext = unknown>(getOptions: (get: Getter) => MutationOptions$1<TData, TError, TVariables, TContext>, getQueryClient?: (get: Getter) => QueryClient): Atom<AtomWithMutationResult<TData, TError, TVariables, TContext>>;

declare function atomWithSuspenseInfiniteQuery<TQueryFnData, TError = DefaultError, TData = InfiniteData<TQueryFnData>, TQueryKey extends QueryKey = QueryKey, TPageParam = unknown>(getOptions: (get: Getter) => AtomWithSuspenseInfiniteQueryOptions<TQueryFnData, TError, TData, TQueryKey, TPageParam>, getQueryClient?: (get: Getter) => QueryClient): WritableAtom<AtomWithSuspenseInfiniteQueryResult<TData, TError>, [], void>;

type MutationStateOptions<TResult = MutationState> = {
    filters?: MutationFilters;
    select?: (mutation: Mutation<unknown, DefaultError, unknown, unknown>) => TResult;
};
declare const atomWithMutationState: <TResult = MutationState>(getOptions: (get: Getter) => MutationStateOptions<TResult>, getQueryClient?: (get: Getter) => QueryClient) => jotai.Atom<TResult[]>;

export { atomWithInfiniteQuery, atomWithMutation, atomWithMutationState, atomWithQueries, atomWithQuery, atomWithSuspenseInfiniteQuery, atomWithSuspenseQuery };
export type { AtomWithInfiniteQueryOptions, AtomWithInfiniteQueryResult, AtomWithMutationResult, AtomWithQueryOptions, AtomWithQueryResult, AtomWithSuspenseInfiniteQueryOptions, AtomWithSuspenseInfiniteQueryResult, AtomWithSuspenseQueryOptions, AtomWithSuspenseQueryResult, BaseAtomWithQueryOptions, DefinedAtomWithInfiniteQueryResult, DefinedAtomWithQueryResult, DefinedInitialDataInfiniteOptions, DefinedInitialDataOptions, MutateAsyncFunction, MutateFunction, MutationOptions, UndefinedInitialDataInfiniteOptions, UndefinedInitialDataOptions };
