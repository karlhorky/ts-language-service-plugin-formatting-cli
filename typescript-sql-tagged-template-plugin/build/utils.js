"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.flatten = void 0;
const flatten = (arr) => arr.reduce((acc, innerArr) => [...acc, ...innerArr], []);
exports.flatten = flatten;
//# sourceMappingURL=utils.js.map