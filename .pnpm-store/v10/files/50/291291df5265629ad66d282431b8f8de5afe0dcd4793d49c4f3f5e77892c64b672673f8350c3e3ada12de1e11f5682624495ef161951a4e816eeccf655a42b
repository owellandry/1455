"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatsigClient = void 0;
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
const NoopEvaluationsClient_1 = require("./NoopEvaluationsClient");
const StatsigContext_1 = require("./StatsigContext");
function useStatsigClient() {
    const { client: anyClient, renderVersion, isLoading, } = (0, react_1.useContext)(StatsigContext_1.default);
    const client = (0, react_1.useMemo)(() => {
        if ((0, NoopEvaluationsClient_1.isNoopClient)(anyClient)) {
            client_core_1.Log.warn('Attempting to retrieve a StatsigClient but none was set.');
            return NoopEvaluationsClient_1.NoopEvaluationsClient;
        }
        return anyClient;
    }, [anyClient, renderVersion]);
    const deps = [client, renderVersion];
    const checkGate = (0, react_1.useCallback)((name, options) => {
        return client.checkGate(name, options);
    }, deps);
    const getFeatureGate = (0, react_1.useCallback)((name, options) => {
        return client.getFeatureGate(name, options);
    }, deps);
    const getDynamicConfig = (0, react_1.useCallback)((name, options) => {
        return client.getDynamicConfig(name, options);
    }, deps);
    const getExperiment = (0, react_1.useCallback)((name, options) => {
        return client.getExperiment(name, options);
    }, deps);
    const getLayer = (0, react_1.useCallback)((name, options) => {
        return client.getLayer(name, options);
    }, deps);
    const getParameterStore = (0, react_1.useCallback)((name, options) => {
        return client.getParameterStore(name, options);
    }, deps);
    const logEvent = (0, react_1.useCallback)((eventName, value, metadata) => {
        if (typeof eventName === 'string') {
            return client.logEvent(eventName, value, metadata);
        }
        return client.logEvent(eventName);
    }, deps);
    return (0, react_1.useMemo)(() => {
        return {
            client,
            checkGate,
            getFeatureGate,
            getDynamicConfig,
            getExperiment,
            getLayer,
            getParameterStore,
            logEvent,
            isLoading,
        };
    }, [
        client,
        checkGate,
        getFeatureGate,
        getDynamicConfig,
        getExperiment,
        getLayer,
        getParameterStore,
        logEvent,
        isLoading,
    ]);
}
exports.useStatsigClient = useStatsigClient;
