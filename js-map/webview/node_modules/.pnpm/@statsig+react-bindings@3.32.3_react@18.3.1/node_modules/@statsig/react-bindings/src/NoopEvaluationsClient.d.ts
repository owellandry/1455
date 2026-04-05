import { PrecomputedEvaluationsInterface } from '@statsig/client-core';
export declare const NoopEvaluationsClient: PrecomputedEvaluationsInterface & {
    isNoop: true;
};
export declare function isNoopClient(client: PrecomputedEvaluationsInterface): boolean;
