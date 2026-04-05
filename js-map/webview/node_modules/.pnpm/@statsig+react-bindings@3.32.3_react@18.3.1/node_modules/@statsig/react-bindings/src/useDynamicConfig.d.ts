import { DynamicConfig, DynamicConfigEvaluationOptions } from '@statsig/client-core';
export type UseDynamicConfigOptions = DynamicConfigEvaluationOptions;
export default function (configName: string, options?: UseDynamicConfigOptions): DynamicConfig;
