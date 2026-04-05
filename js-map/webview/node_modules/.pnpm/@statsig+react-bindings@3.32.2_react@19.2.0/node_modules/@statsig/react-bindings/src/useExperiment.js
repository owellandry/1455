"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
const NoopEvaluationsClient_1 = require("./NoopEvaluationsClient");
const StatsigContext_1 = require("./StatsigContext");
function default_1(experimentName, options) {
    const { client, renderVersion } = (0, react_1.useContext)(StatsigContext_1.default);
    return (0, react_1.useMemo)(() => {
        if ((0, NoopEvaluationsClient_1.isNoopClient)(client)) {
            client_core_1.Log.warn(`useExperiment hook failed to find a valid Statsig client for experiment '${experimentName}'.`);
            return NoopEvaluationsClient_1.NoopEvaluationsClient.getExperiment(experimentName, options);
        }
        return client.getExperiment(experimentName, options);
    }, [
        experimentName,
        client,
        renderVersion,
        ...(options ? Object.values(options) : []),
    ]);
}
exports.default = default_1;
