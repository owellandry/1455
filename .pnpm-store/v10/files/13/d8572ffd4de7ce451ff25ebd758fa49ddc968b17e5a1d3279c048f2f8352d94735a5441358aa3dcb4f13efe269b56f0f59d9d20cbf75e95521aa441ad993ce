"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatsigInternalClientFactoryAsync = void 0;
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
function useStatsigInternalClientFactoryAsync(factory, args) {
    const client = (0, react_1.useMemo)(() => { var _a; return (_a = (0, client_core_1._getInstance)(args.sdkKey)) !== null && _a !== void 0 ? _a : factory(args); }, []);
    const [isLoading, setIsLoading] = (0, react_1.useState)(client.loadingStatus !== 'Ready');
    (0, react_1.useMemo)(() => {
        if (client.loadingStatus !== 'Ready') {
            // Repeat calls to initializeAsync return the same promise.
            // But if the client is already loaded, we don't want the promise
            // resolution to trigger an extra render on `setIsLoading(false)`
            client
                .initializeAsync()
                .catch(client_core_1.Log.error)
                .finally(() => setIsLoading(false));
        }
    }, []);
    return { client, isLoading };
}
exports.useStatsigInternalClientFactoryAsync = useStatsigInternalClientFactoryAsync;
