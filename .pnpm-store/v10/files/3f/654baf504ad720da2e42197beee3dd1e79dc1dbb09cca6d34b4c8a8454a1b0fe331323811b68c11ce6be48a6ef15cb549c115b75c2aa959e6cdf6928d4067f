"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventSender = void 0;
const Log_1 = require("./Log");
const NetworkConfig_1 = require("./NetworkConfig");
const VisibilityObserving_1 = require("./VisibilityObserving");
class EventSender {
    constructor(sdkKey, network, emitter, logEventUrlConfig, options) {
        this._sdkKey = sdkKey;
        this._network = network;
        this._emitter = emitter;
        this._options = options;
        this._logEventUrlConfig = logEventUrlConfig;
    }
    setLogEventCompressionMode(mode) {
        this._network.setLogEventCompressionMode(mode);
    }
    sendBatch(batch) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const isClosing = (0, VisibilityObserving_1._isUnloading)();
                const shouldUseBeacon = isClosing &&
                    this._network.isBeaconSupported() &&
                    ((_b = (_a = this._options) === null || _a === void 0 ? void 0 : _a.networkConfig) === null || _b === void 0 ? void 0 : _b.networkOverrideFunc) == null;
                this._emitter({
                    name: 'pre_logs_flushed',
                    events: batch.events,
                });
                const response = shouldUseBeacon
                    ? this._sendEventsViaBeacon(batch)
                    : yield this._sendEventsViaPost(batch);
                if (response.success) {
                    this._emitter({
                        name: 'logs_flushed',
                        events: batch.events,
                    });
                    return response;
                }
                return { success: false, statusCode: response.statusCode };
            }
            catch (error) {
                Log_1.Log.warn('Failed to send batch:', error);
                return { success: false, statusCode: -1 };
            }
        });
    }
    _sendEventsViaPost(batch) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            const result = yield this._network.post(this._getRequestData(batch));
            const code = (_a = result === null || result === void 0 ? void 0 : result.code) !== null && _a !== void 0 ? _a : -1;
            return { success: code >= 200 && code < 300, statusCode: code };
        });
    }
    _sendEventsViaBeacon(batch) {
        const success = this._network.beacon(this._getRequestData(batch));
        return {
            success,
            statusCode: success ? 200 : -1,
        };
    }
    _getRequestData(batch) {
        return {
            sdkKey: this._sdkKey,
            data: {
                events: batch.events,
            },
            urlConfig: this._logEventUrlConfig,
            retries: 3,
            preserveFailedStatusCode: true,
            isCompressable: true,
            params: {
                [NetworkConfig_1.NetworkParam.EventCount]: String(batch.events.length),
            },
            headers: {
                'statsig-event-count': String(batch.events.length),
                'statsig-retry-count': String(batch.attempts),
            },
            credentials: 'same-origin',
        };
    }
}
exports.EventSender = EventSender;
