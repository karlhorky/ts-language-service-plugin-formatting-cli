"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubstitutions = void 0;
const getSubstitutions = (templateString, spans) => spans.reduce((str, span, i) => {
    const prefix = str.substring(0, span.start);
    const suffix = str.substring(span.end);
    const param = `$${i + 1}`;
    const paddingLength = span.end - span.start - param.length;
    if (paddingLength < 0) {
        throw new Error("Substitution is longer than expression.");
    }
    return prefix + param + " ".repeat(paddingLength) + suffix;
}, templateString);
exports.getSubstitutions = getSubstitutions;
//# sourceMappingURL=substitutions.js.map