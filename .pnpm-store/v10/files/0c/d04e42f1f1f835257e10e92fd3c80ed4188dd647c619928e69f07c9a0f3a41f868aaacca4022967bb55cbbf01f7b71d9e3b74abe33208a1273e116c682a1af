import { StatsigUser } from '@statsig/client-core';
import { StatsigClient, StatsigOptions } from '@statsig/js-client';
type FactoryArgs = {
    sdkKey: string;
    initialUser: StatsigUser;
    initialValues: string;
    statsigOptions: StatsigOptions | null;
    useLegacyFormat?: boolean;
};
export declare function useStatsigInternalClientFactoryBootstrap<T extends StatsigClient>(factory: (args: FactoryArgs) => T, args: FactoryArgs): T;
export {};
