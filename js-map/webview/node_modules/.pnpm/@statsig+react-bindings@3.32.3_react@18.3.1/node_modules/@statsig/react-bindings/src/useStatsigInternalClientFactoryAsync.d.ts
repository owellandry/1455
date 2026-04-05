import { StatsigUser } from '@statsig/client-core';
import { StatsigClient, StatsigOptions } from '@statsig/js-client';
type FactoryArgs = {
    sdkKey: string;
    initialUser: StatsigUser;
    statsigOptions: StatsigOptions | null;
};
export declare function useStatsigInternalClientFactoryAsync<T extends StatsigClient>(factory: (args: FactoryArgs) => T, args: FactoryArgs): {
    isLoading: boolean;
    client: T;
};
export {};
