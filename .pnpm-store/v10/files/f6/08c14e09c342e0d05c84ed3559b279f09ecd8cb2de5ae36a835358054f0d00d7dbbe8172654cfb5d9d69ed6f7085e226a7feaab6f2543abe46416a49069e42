"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useStatsigInternalClientFactoryBootstrap = void 0;
const react_1 = require("react");
const client_core_1 = require("@statsig/client-core");
function useStatsigInternalClientFactoryBootstrap(factory, args) {
    const clientRef = (0, react_1.useRef)((0, client_core_1._getInstance)(args.sdkKey));
    return (0, react_1.useMemo)(() => {
        if (clientRef.current) {
            return clientRef.current;
        }
        const inst = factory(args);
        clientRef.current = inst;
        if (args.useLegacyFormat) {
            inst.dataAdapter.setDataLegacy(args.initialValues, args.initialUser);
        }
        else {
            inst.dataAdapter.setData(args.initialValues);
        }
        inst.initializeSync();
        return inst;
    }, []);
}
exports.useStatsigInternalClientFactoryBootstrap = useStatsigInternalClientFactoryBootstrap;
