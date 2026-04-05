"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useClientBootstrapInit = void 0;
const js_client_1 = require("@statsig/js-client");
const useStatsigInternalClientFactoryBootstrap_1 = require("./useStatsigInternalClientFactoryBootstrap");
function useClientBootstrapInit(sdkKey, initialUser, initialValues, statsigOptions = null, useLegacyFormat) {
    return (0, useStatsigInternalClientFactoryBootstrap_1.useStatsigInternalClientFactoryBootstrap)((args) => new js_client_1.StatsigClient(args.sdkKey, args.initialUser, args.statsigOptions), {
        sdkKey,
        initialUser,
        initialValues,
        statsigOptions,
        useLegacyFormat,
    });
}
exports.useClientBootstrapInit = useClientBootstrapInit;
