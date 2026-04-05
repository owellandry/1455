import { StatsigUser } from '@statsig/client-core';
import { StatsigClient, StatsigOptions } from '@statsig/js-client';
export declare function useClientAsyncInit(sdkKey: string, initialUser: StatsigUser, statsigOptions?: StatsigOptions | null): {
    isLoading: boolean;
    client: StatsigClient;
};
