"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isNoopClient = exports.NoopEvaluationsClient = void 0;
const client_core_1 = require("@statsig/client-core");
const noopInitializeDetails = {
    success: false,
    error: Error('NoClient'),
    duration: 0,
    source: 'Uninitialized',
    sourceUrl: null,
};
const _noop = () => {
    // noop
};
const _noopWithInitializeDetails = () => noopInitializeDetails;
const _noopAsync = () => Promise.resolve();
const _noopAsyncWithInitializeDetails = () => Promise.resolve(noopInitializeDetails);
const NOOP_DETAILS = { reason: 'Error:NoClient' };
const _defaultEvaluation = (type) => {
    return (...args) => {
        const name = typeof args[0] === 'string' ? args[0] : args[1];
        switch (type) {
            case 'gate':
                return (0, client_core_1._makeFeatureGate)(name, NOOP_DETAILS, null);
            case 'config':
                return (0, client_core_1._makeDynamicConfig)(name, NOOP_DETAILS, null);
            case 'layer':
                return (0, client_core_1._makeLayer)(name, NOOP_DETAILS, null);
            case 'param_store':
                return { name };
        }
    };
};
const _noopDataAdapter = {
    attach: _noop,
    getDataSync: () => null,
    getDataAsync: () => Promise.resolve(null),
    setData: _noop,
    setDataLegacy: _noop,
    prefetchData: _noopAsync,
};
const context = {
    sdkKey: '',
    options: {},
    values: null,
    user: { userID: '' },
    errorBoundary: {},
    session: {
        data: { sessionID: '', startTime: 0, lastUpdate: 0 },
        sdkKey: '',
        lastPersistedAt: 0,
        storageKey: '',
    },
    stableID: '',
    storageProvider: client_core_1.Storage,
    sdkInstanceID: '',
};
const _noopContextHandle = new client_core_1.PrecomputedEvaluationsContextHandle('', () => ({}), () => ({}), () => null, () => ({ userID: '' }), () => '');
const _client = {
    isNoop: true,
    loadingStatus: 'Uninitialized',
    initializeSync: _noopWithInitializeDetails,
    initializeAsync: _noopAsyncWithInitializeDetails,
    shutdown: _noopAsync,
    flush: _noopAsync,
    updateRuntimeOptions: _noop,
    updateUserSync: _noopWithInitializeDetails,
    updateUserAsync: _noopAsyncWithInitializeDetails,
    getContext: () => (Object.assign({}, context)),
    getContextHandle: () => _noopContextHandle,
    checkGate: () => false,
    getFeatureGate: _defaultEvaluation('gate'),
    getDynamicConfig: _defaultEvaluation('config'),
    getExperiment: _defaultEvaluation('config'),
    getLayer: _defaultEvaluation('layer'),
    getParameterStore: _defaultEvaluation('param_store'),
    logEvent: _noop,
    on: _noop,
    off: _noop,
    $on: _noop,
    $emt: _noop,
    dataAdapter: _noopDataAdapter,
};
exports.NoopEvaluationsClient = _client;
function isNoopClient(client) {
    return 'isNoop' in client;
}
exports.isNoopClient = isNoopClient;
