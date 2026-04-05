import { FeatureGate, FeatureGateEvaluationOptions } from '@statsig/client-core';
export type useFeatureGateOptions = FeatureGateEvaluationOptions;
export default function (gateName: string, options?: useFeatureGateOptions): FeatureGate;
