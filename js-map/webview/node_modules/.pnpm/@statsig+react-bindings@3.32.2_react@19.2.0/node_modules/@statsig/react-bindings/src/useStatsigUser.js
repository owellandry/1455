"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatsigUser = void 0;
const react_1 = require("react");
const StatsigContext_1 = require("./StatsigContext");
const useStatsigClient_1 = require("./useStatsigClient");
function getClientUser(client) {
    const context = client.getContextHandle();
    return context.user;
}
function useStatsigUser() {
    const { client } = (0, useStatsigClient_1.useStatsigClient)();
    const { renderVersion } = (0, react_1.useContext)(StatsigContext_1.default);
    const memoUser = (0, react_1.useMemo)(() => {
        return getClientUser(client);
    }, [client, renderVersion]);
    return {
        user: memoUser,
        updateUserSync: (0, react_1.useCallback)((arg) => {
            if (typeof arg === 'function') {
                arg = arg(getClientUser(client));
            }
            return client.updateUserSync(arg);
        }, [client]),
        updateUserAsync: (0, react_1.useCallback)((arg) => {
            if (typeof arg === 'function') {
                arg = arg(getClientUser(client));
            }
            return client.updateUserAsync(arg);
        }, [client]),
    };
}
exports.useStatsigUser = useStatsigUser;
