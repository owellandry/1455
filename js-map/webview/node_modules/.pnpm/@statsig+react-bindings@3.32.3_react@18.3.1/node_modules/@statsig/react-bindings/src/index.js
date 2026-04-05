"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatsigUser = exports.useStatsigInternalClientFactoryBootstrap = exports.useStatsigInternalClientFactoryAsync = exports.useStatsigClient = exports.useParameterStore = exports.useLayer = exports.useGateValue = exports.useFeatureGate = exports.useExperiment = exports.useDynamicConfig = exports.useClientBootstrapInit = exports.useClientAsyncInit = exports.StatsigProvider = exports.StatsigContext = void 0;
const client_core_1 = require("@statsig/client-core");
const StatsigContext_1 = require("./StatsigContext");
exports.StatsigContext = StatsigContext_1.default;
const StatsigProvider_1 = require("./StatsigProvider");
Object.defineProperty(exports, "StatsigProvider", { enumerable: true, get: function () { return StatsigProvider_1.StatsigProvider; } });
const useClientAsyncInit_1 = require("./useClientAsyncInit");
Object.defineProperty(exports, "useClientAsyncInit", { enumerable: true, get: function () { return useClientAsyncInit_1.useClientAsyncInit; } });
const useClientBootstrapInit_1 = require("./useClientBootstrapInit");
Object.defineProperty(exports, "useClientBootstrapInit", { enumerable: true, get: function () { return useClientBootstrapInit_1.useClientBootstrapInit; } });
const useDynamicConfig_1 = require("./useDynamicConfig");
exports.useDynamicConfig = useDynamicConfig_1.default;
const useExperiment_1 = require("./useExperiment");
exports.useExperiment = useExperiment_1.default;
const useFeatureGate_1 = require("./useFeatureGate");
exports.useFeatureGate = useFeatureGate_1.default;
const useGateValue_1 = require("./useGateValue");
exports.useGateValue = useGateValue_1.default;
const useLayer_1 = require("./useLayer");
exports.useLayer = useLayer_1.default;
const useParameterStore_1 = require("./useParameterStore");
exports.useParameterStore = useParameterStore_1.default;
const useStatsigClient_1 = require("./useStatsigClient");
Object.defineProperty(exports, "useStatsigClient", { enumerable: true, get: function () { return useStatsigClient_1.useStatsigClient; } });
const useStatsigInternalClientFactoryAsync_1 = require("./useStatsigInternalClientFactoryAsync");
Object.defineProperty(exports, "useStatsigInternalClientFactoryAsync", { enumerable: true, get: function () { return useStatsigInternalClientFactoryAsync_1.useStatsigInternalClientFactoryAsync; } });
const useStatsigInternalClientFactoryBootstrap_1 = require("./useStatsigInternalClientFactoryBootstrap");
Object.defineProperty(exports, "useStatsigInternalClientFactoryBootstrap", { enumerable: true, get: function () { return useStatsigInternalClientFactoryBootstrap_1.useStatsigInternalClientFactoryBootstrap; } });
const useStatsigUser_1 = require("./useStatsigUser");
Object.defineProperty(exports, "useStatsigUser", { enumerable: true, get: function () { return useStatsigUser_1.useStatsigUser; } });
__exportStar(require("@statsig/js-client"), exports);
Object.assign((0, client_core_1._getStatsigGlobal)(), {
    StatsigContext: StatsigContext_1.default,
    StatsigProvider: StatsigProvider_1.StatsigProvider,
    useClientAsyncInit: useClientAsyncInit_1.useClientAsyncInit,
    useClientBootstrapInit: useClientBootstrapInit_1.useClientBootstrapInit,
    useDynamicConfig: useDynamicConfig_1.default,
    useExperiment: useExperiment_1.default,
    useFeatureGate: useFeatureGate_1.default,
    useGateValue: useGateValue_1.default,
    useLayer: useLayer_1.default,
    useParameterStore: useParameterStore_1.default,
    useStatsigClient: useStatsigClient_1.useStatsigClient,
    useStatsigInternalClientFactoryAsync: useStatsigInternalClientFactoryAsync_1.useStatsigInternalClientFactoryAsync,
    useStatsigInternalClientFactoryBootstrap: useStatsigInternalClientFactoryBootstrap_1.useStatsigInternalClientFactoryBootstrap,
    useStatsigUser: useStatsigUser_1.useStatsigUser,
});
