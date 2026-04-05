"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDev = isDev;
function isDev() {
    var _a;
    return Boolean(typeof process !== 'undefined' &&
        ((_a = process.env) === null || _a === void 0 ? void 0 : _a.NODE_ENV) &&
        process.env.NODE_ENV !== 'production');
}
//# sourceMappingURL=env.js.map