import { ParameterStore, ParameterStoreEvaluationOptions } from '@statsig/client-core';
export type useParameterStoreOptions = ParameterStoreEvaluationOptions;
export default function (storeName: string, options?: useParameterStoreOptions): ParameterStore;
