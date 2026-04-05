import * as React from 'react';
import { ReactNode } from 'react';
import { StatsigUser } from '@statsig/client-core';
import { StatsigClient, StatsigOptions } from '@statsig/js-client';
type WithClient<T extends StatsigClient> = {
    client: T;
};
type WithConfiguration = {
    sdkKey: string;
    user: StatsigUser;
    options?: StatsigOptions;
};
type ProviderChildrenProps = {
    children: ReactNode | ReactNode[];
    loadingComponent?: ReactNode | ReactNode[];
};
export type StatsigProviderProps<T extends StatsigClient> = ProviderChildrenProps & (WithClient<T> | WithConfiguration);
export declare function StatsigProvider(props: StatsigProviderProps<StatsigClient>): React.ReactElement;
export {};
