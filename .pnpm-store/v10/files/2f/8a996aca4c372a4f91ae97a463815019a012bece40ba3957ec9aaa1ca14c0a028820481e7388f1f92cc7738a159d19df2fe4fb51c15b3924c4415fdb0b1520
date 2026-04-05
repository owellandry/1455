import { StatsigUpdateDetails, StatsigUser } from '@statsig/client-core';
type UpdaterArg = StatsigUser | ((previous: StatsigUser) => StatsigUser);
type UpdaterFunc<T> = (updated: UpdaterArg) => T;
type SyncUpdateFunc = UpdaterFunc<StatsigUpdateDetails>;
type AsyncUpdateFunc = UpdaterFunc<Promise<StatsigUpdateDetails>>;
export type UseStatsigUserResult = {
    user: StatsigUser;
    updateUserSync: SyncUpdateFunc;
    updateUserAsync: AsyncUpdateFunc;
};
export declare function useStatsigUser(): UseStatsigUserResult;
export {};
