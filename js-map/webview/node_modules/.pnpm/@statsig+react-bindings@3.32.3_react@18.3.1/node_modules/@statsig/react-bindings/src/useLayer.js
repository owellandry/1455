"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
const NoopEvaluationsClient_1 = require("./NoopEvaluationsClient");
const StatsigContext_1 = require("./StatsigContext");
function default_1(layerName, options) {
    const { client, renderVersion } = (0, react_1.useContext)(StatsigContext_1.default);
    const layer = (0, react_1.useMemo)(() => {
        if ((0, NoopEvaluationsClient_1.isNoopClient)(client)) {
            client_core_1.Log.warn(`useLayer hook failed to find a valid Statsig client for layer '${layerName}'.`);
            return NoopEvaluationsClient_1.NoopEvaluationsClient.getLayer(layerName, options);
        }
        return client.getLayer(layerName, options);
    }, [
        layerName,
        client,
        renderVersion,
        ...(options ? Object.values(options) : []),
    ]);
    return layer;
}
exports.default = default_1;
