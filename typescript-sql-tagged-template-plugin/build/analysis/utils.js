"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.other = exports.notSupported = exports.assignMap = void 0;
const assignMap = (dst, ...maps) => {
    for (const map of maps) {
        if (map) {
            for (const [key, value] of map.entries()) {
                dst.set(key, value);
            }
        }
    }
};
exports.assignMap = assignMap;
const notSupported = (what, node) => ({
    type: "not_supported",
    what,
    node,
});
exports.notSupported = notSupported;
const other = (what, node) => ({
    type: "other",
    what,
    node,
});
exports.other = other;
//# sourceMappingURL=utils.js.map