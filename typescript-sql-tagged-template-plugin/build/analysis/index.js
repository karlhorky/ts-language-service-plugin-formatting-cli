"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyze = exports.ParseError = void 0;
const pg_query_emscripten_1 = require("pg-query-emscripten");
const pg_query_emscripten_type_guards_1 = require("./pg-query-emscripten-type-guards");
const params_1 = require("./params");
const utils_1 = require("./utils");
class ParseError extends Error {
    constructor(error) {
        super(error.message);
        this.cursorPosition = error.cursorpos;
    }
}
exports.ParseError = ParseError;
const analyze = (query) => {
    const warnings = [];
    const result = pg_query_emscripten_1.parse(query);
    if (result.error) {
        throw new ParseError(result.error);
    }
    else if (result.parse_tree) {
        const stmt = result.parse_tree[0];
        let parameters;
        if (pg_query_emscripten_type_guards_1.isPgRawStmt(stmt) && stmt.RawStmt.stmt) {
            const innerStmt = stmt.RawStmt.stmt;
            if (pg_query_emscripten_type_guards_1.isPgUpdateStmt(innerStmt)) {
                parameters = params_1.getParamMapForUpdate(innerStmt, warnings);
            }
            else if (pg_query_emscripten_type_guards_1.isPgInsertStmt(innerStmt)) {
                parameters = params_1.getParamMapForInsert(innerStmt, warnings);
            }
            else if (pg_query_emscripten_type_guards_1.isPgSelectStmt(innerStmt)) {
                parameters = params_1.getParamMapForSelect(innerStmt, warnings);
            }
            else if (pg_query_emscripten_type_guards_1.isPgDeleteStmt(innerStmt)) {
                parameters = params_1.getParamMapForDelete(innerStmt, warnings);
            }
            else {
                warnings.push(utils_1.notSupported("statement", innerStmt));
                parameters = [];
            }
        }
        else {
            warnings.push(utils_1.notSupported("statement", stmt));
            parameters = [];
        }
        return {
            warnings,
            parameters,
        };
    }
    else {
        throw new Error("Got no result");
    }
};
exports.analyze = analyze;
//# sourceMappingURL=index.js.map