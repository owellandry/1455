"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
const NoopEvaluationsClient_1 = require("./NoopEvaluationsClient");
const StatsigContext_1 = require("./StatsigContext");
function default_1(storeName, options) {
    const { client, renderVersion } = (0, react_1.useContext)(StatsigContext_1.default);
    const store = (0, react_1.useMemo)(() => {
        if ((0, NoopEvaluationsClient_1.isNoopClient)(client)) {
            client_core_1.Log.warn(`useParameterStore hook failed to find a valid StatsigClient for parameter store '${storeName}'.`);
            return NoopEvaluationsClient_1.NoopEvaluationsClient.getParameterStore(storeName, options);
        }
        return client.getParameterStore(storeName, options);
    }, [
        storeName,
        client,
        renderVersion,
        ...(options ? Object.values(options) : []),
    ]);
    return store;
}
exports.default = default_1;
