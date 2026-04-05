import { EventBatch } from './EventBatch';
import { NetworkCore } from './NetworkCore';
import { StatsigClientEmitEventFunc } from './StatsigClientBase';
import { LogEventCompressionMode, NetworkConfigCommon, StatsigOptionsCommon } from './StatsigOptionsCommon';
import { UrlConfiguration } from './UrlConfiguration';
export declare class EventSender {
    private _network;
    private _sdkKey;
    private _options;
    private _logEventUrlConfig;
    private _emitter;
    constructor(sdkKey: string, network: NetworkCore, emitter: StatsigClientEmitEventFunc, logEventUrlConfig: UrlConfiguration, options: StatsigOptionsCommon<NetworkConfigCommon> | null);
    setLogEventCompressionMode(mode: LogEventCompressionMode): void;
    sendBatch(batch: EventBatch): Promise<{
        success: boolean;
        statusCode: number;
    }>;
    private _sendEventsViaPost;
    private _sendEventsViaBeacon;
    private _getRequestData;
}
