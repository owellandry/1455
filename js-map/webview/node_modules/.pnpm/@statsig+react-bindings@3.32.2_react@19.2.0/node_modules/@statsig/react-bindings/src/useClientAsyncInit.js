"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useClientAsyncInit = void 0;
const js_client_1 = require("@statsig/js-client");
const useStatsigInternalClientFactoryAsync_1 = require("./useStatsigInternalClientFactoryAsync");
function useClientAsyncInit(sdkKey, initialUser, statsigOptions = null) {
    return (0, useStatsigInternalClientFactoryAsync_1.useStatsigInternalClientFactoryAsync)((args) => new js_client_1.StatsigClient(args.sdkKey, args.initialUser, args.statsigOptions), {
        sdkKey,
        initialUser,
        statsigOptions,
    });
}
exports.useClientAsyncInit = useClientAsyncInit;
