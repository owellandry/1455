"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsigProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
const StatsigContext_1 = require("./StatsigContext");
const useClientAsyncInit_1 = require("./useClientAsyncInit");
function StatsigProvider(props) {
    if (!('client' in props)) {
        return (0, jsx_runtime_1.jsx)(ConfigBasedStatsigProvider, Object.assign({}, props));
    }
    if ('sdkKey' in props || 'user' in props) {
        client_core_1.Log.warn('Both client and configuration props (sdkKey, user) were provided to StatsigProvider. The client prop will be used and the configuration props will be ignored.');
    }
    return (0, jsx_runtime_1.jsx)(ClientBasedStatsigProvider, Object.assign({}, props));
}
exports.StatsigProvider = StatsigProvider;
function ConfigBasedStatsigProvider(props) {
    const [renderVersion, setRenderVersion] = (0, react_1.useState)(0);
    const client = (0, useClientAsyncInit_1.useClientAsyncInit)(props.sdkKey, props.user, props.options).client;
    const [isLoading, setIsLoading] = (0, react_1.useState)(!_isReady(client));
    useStatsigClientSetup(client, setRenderVersion, setIsLoading);
    const contextValue = (0, react_1.useMemo)(() => ({
        renderVersion,
        client,
        isLoading,
    }), [renderVersion, client, isLoading]);
    return ((0, jsx_runtime_1.jsx)(StatsigContext_1.default.Provider, { value: contextValue, children: props.loadingComponent == null || !contextValue.isLoading
            ? props.children
            : props.loadingComponent }));
}
function ClientBasedStatsigProvider(props) {
    const [renderVersion, setRenderVersion] = (0, react_1.useState)(0);
    const client = props.client;
    const [isLoading, setIsLoading] = (0, react_1.useState)(!_isReady(client));
    useStatsigClientSetup(client, setRenderVersion, setIsLoading);
    const contextValue = (0, react_1.useMemo)(() => ({
        renderVersion,
        client,
        isLoading,
    }), [renderVersion, client, isLoading]);
    return ((0, jsx_runtime_1.jsx)(StatsigContext_1.default.Provider, { value: contextValue, children: props.loadingComponent == null || !contextValue.isLoading
            ? props.children
            : props.loadingComponent }));
}
function useStatsigClientSetup(client, setRenderVersion, setIsLoading) {
    (0, react_1.useEffect)(() => {
        const onValuesUpdated = () => {
            setRenderVersion((v) => v + 1);
            setIsLoading(!_isReady(client));
        };
        client_core_1.SDKType._setBindingType('react');
        client.$on('values_updated', onValuesUpdated);
        return () => {
            client
                .flush()
                .catch((err) => client_core_1.Log.error('An error occurred during flush', err));
            client.off('values_updated', onValuesUpdated);
        };
    }, [client, setRenderVersion]);
}
function _isReady(client) {
    if ('isNoop' in client) {
        return true;
    }
    switch (client.loadingStatus) {
        case 'Ready':
            return true;
        default:
            return false;
    }
}
