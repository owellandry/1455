import { PrecomputedEvaluationsInterface } from '@statsig/client-core';
type HositedFuncs = Pick<PrecomputedEvaluationsInterface, 'checkGate' | 'getFeatureGate' | 'getDynamicConfig' | 'getExperiment' | 'getLayer' | 'getParameterStore' | 'logEvent'>;
type Output = HositedFuncs & {
    client: PrecomputedEvaluationsInterface;
    isLoading: boolean;
};
export declare function useStatsigClient(): Output;
export {};
