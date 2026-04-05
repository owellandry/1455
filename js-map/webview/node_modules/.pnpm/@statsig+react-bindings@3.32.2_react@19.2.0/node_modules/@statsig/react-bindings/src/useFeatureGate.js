"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
const NoopEvaluationsClient_1 = require("./NoopEvaluationsClient");
const StatsigContext_1 = require("./StatsigContext");
function default_1(gateName, options) {
    const { client, renderVersion } = (0, react_1.useContext)(StatsigContext_1.default);
    const gate = (0, react_1.useMemo)(() => {
        if ((0, NoopEvaluationsClient_1.isNoopClient)(client)) {
            client_core_1.Log.warn(`useFeatureGate hook failed to find a valid StatsigClient for gate '${gateName}'.`);
            return NoopEvaluationsClient_1.NoopEvaluationsClient.getFeatureGate(gateName, options);
        }
        return client.getFeatureGate(gateName, options);
    }, [
        gateName,
        client,
        renderVersion,
        ...(options ? Object.values(options) : []),
    ]);
    return gate;
}
exports.default = default_1;
