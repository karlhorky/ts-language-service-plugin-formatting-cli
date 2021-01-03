"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getParamMapForDelete = exports.getParamMapForSelect = exports.getParamMapForInsert = exports.getParamMapForUpdate = void 0;
const pg_query_emscripten_type_guards_1 = require("./pg-query-emscripten-type-guards");
const utils_1 = require("./utils");
const COMPARISON_OPERATORS = ["<", ">", "<=", ">=", "=", "<>"];
const JSON_OPERATORS = ["->", "->>", "#>", "#>>"];
const JSON_OPERATORS_RETURNING_TEXT = ["->>", "#>>"];
const getColumn = (columnRef, relations, warnings) => {
    if (columnRef.ColumnRef.fields.length === 0) {
        throw new Error(`ColumnRef has no fields: ${JSON.stringify(columnRef)}`);
    }
    if (columnRef.ColumnRef.fields.length > 2) {
        warnings.push(utils_1.other("ColumnRef has more then 2 fields", columnRef));
    }
    const getField = (field) => {
        if (pg_query_emscripten_type_guards_1.isPgString(field)) {
            return field.String.str;
        }
        else {
            throw new Error(`ColumnRef field has no name: ${JSON.stringify(columnRef)}`);
        }
    };
    let relation;
    let column;
    if (columnRef.ColumnRef.fields.length == 1) {
        relation =
            relations.size === 1
                ? Array.from(relations.values())[0]
                : relations.get("") || { table: "<NOT FOUND>" };
        column = getField(columnRef.ColumnRef.fields[0]);
    }
    else {
        const tableOrAlias = getField(columnRef.ColumnRef.fields[0]);
        relation = relations.get(tableOrAlias) || { table: tableOrAlias };
        column = getField(columnRef.ColumnRef.fields[1]);
    }
    return {
        ...relation,
        column,
        isArray: false,
    };
};
const getRelation = (node) => ({
    schema: node.RangeVar.schemaname,
    table: node.RangeVar.relname,
});
const getRelations = (node) => {
    const relations = new Map();
    if (pg_query_emscripten_type_guards_1.isPgJoinExpr(node)) {
        utils_1.assignMap(relations, getRelations(node.JoinExpr.larg), getRelations(node.JoinExpr.rarg));
    }
    else if (pg_query_emscripten_type_guards_1.isPgRangeVar(node)) {
        relations.set(node.RangeVar.alias ? node.RangeVar.alias.Alias.aliasname : "", getRelation(node));
    }
    return relations;
};
const getRelationsForFromClause = (fromClause) => {
    const relations = new Map();
    utils_1.assignMap(relations, ...fromClause.map(getRelations));
    return relations;
};
const getOperator = (expr) => {
    const name = expr.A_Expr.name;
    if (name && pg_query_emscripten_type_guards_1.isPgNodeArray(name)) {
        const first = name[0];
        if (first && pg_query_emscripten_type_guards_1.isPgString(first)) {
            return first.String.str;
        }
    }
};
const getParamMapForWhereClause = (whereClause, relations, warnings) => {
    const params = [];
    if (pg_query_emscripten_type_guards_1.isPgA_Expr(whereClause)) {
        const expr = whereClause.A_Expr;
        switch (expr.kind) {
            case 7 /* AEXPR_IN */:
                if (pg_query_emscripten_type_guards_1.isPgNodeArray(expr.rexpr)) {
                    if (pg_query_emscripten_type_guards_1.isPgColumnRef(expr.lexpr)) {
                        const column = getColumn(expr.lexpr, relations, warnings);
                        for (const field of expr.rexpr) {
                            if (pg_query_emscripten_type_guards_1.isPgParamRef(field)) {
                                params.push({
                                    index: field.ParamRef.number,
                                    location: field.ParamRef.location,
                                    usedWith: column,
                                });
                            }
                        }
                    }
                    else {
                        warnings.push(utils_1.notSupported("where clause", whereClause));
                    }
                }
                else {
                    warnings.push(utils_1.notSupported("where clause", whereClause));
                }
                break;
            case 0 /* AEXPR_OP */:
            case 1 /* AEXPR_OP_ANY */:
            case 2 /* AEXPR_OP_ALL */:
                const operator = getOperator(whereClause);
                if (!operator || !COMPARISON_OPERATORS.includes(operator)) {
                    warnings.push(utils_1.notSupported("where clause", whereClause));
                }
                else if (pg_query_emscripten_type_guards_1.isPgParamRef(expr.rexpr)) {
                    const isArray = [
                        1 /* AEXPR_OP_ANY */,
                        2 /* AEXPR_OP_ALL */,
                    ].includes(expr.kind);
                    if (pg_query_emscripten_type_guards_1.isPgColumnRef(expr.lexpr)) {
                        params.push({
                            index: expr.rexpr.ParamRef.number,
                            location: expr.rexpr.ParamRef.location,
                            usedWith: {
                                ...getColumn(expr.lexpr, relations, warnings),
                                isArray,
                            },
                        });
                    }
                    else if (pg_query_emscripten_type_guards_1.isPgA_Expr(expr.lexpr) &&
                        JSON_OPERATORS.includes(getOperator(expr.lexpr) || "") &&
                        pg_query_emscripten_type_guards_1.isPgColumnRef(expr.lexpr.A_Expr.lexpr) &&
                        pg_query_emscripten_type_guards_1.isPgA_Const(expr.lexpr.A_Expr.rexpr)) {
                        const operator = getOperator(expr.lexpr);
                        const pathVal = expr.lexpr.A_Expr.rexpr.A_Const.val;
                        params.push({
                            index: expr.rexpr.ParamRef.number,
                            location: expr.rexpr.ParamRef.location,
                            usedWith: {
                                ...getColumn(expr.lexpr.A_Expr.lexpr, relations, warnings),
                                jsonPath: {
                                    path: pg_query_emscripten_type_guards_1.isPgInteger(pathVal)
                                        ? pathVal.Integer.ival
                                        : pg_query_emscripten_type_guards_1.isPgString(pathVal)
                                            ? pathVal.String.str
                                            : "<UNKNOWN>",
                                    isText: JSON_OPERATORS_RETURNING_TEXT.includes(operator),
                                },
                                isArray,
                            },
                        });
                    }
                    else {
                        warnings.push(utils_1.notSupported("where clause", whereClause));
                    }
                }
                else if (pg_query_emscripten_type_guards_1.isPgSubLink(expr.rexpr) &&
                    expr.rexpr.SubLink.subselect &&
                    pg_query_emscripten_type_guards_1.isPgSelectStmt(expr.rexpr.SubLink.subselect)) {
                    params.push(...exports.getParamMapForSelect(expr.rexpr.SubLink.subselect, warnings, relations));
                }
                else if (!pg_query_emscripten_type_guards_1.isPgColumnRef(expr.rexpr) &&
                    !pg_query_emscripten_type_guards_1.isPgA_Const(expr.rexpr)) {
                    warnings.push(utils_1.notSupported("where clause", whereClause));
                }
                break;
            default:
                warnings.push(utils_1.notSupported("where clause", whereClause));
        }
    }
    else if (pg_query_emscripten_type_guards_1.isPgBoolExpr(whereClause)) {
        const expr = whereClause.BoolExpr;
        for (const arg of expr.args) {
            params.push(...getParamMapForWhereClause(arg, relations, warnings));
        }
    }
    else if (!pg_query_emscripten_type_guards_1.isPgNullTest(whereClause)) {
        warnings.push(utils_1.notSupported("where clause", whereClause));
    }
    return params;
};
const getParamMapForUpdate = (stmt, warnings) => {
    const params = [];
    const mainRelation = getRelation(stmt.UpdateStmt.relation);
    for (const target of stmt.UpdateStmt.targetList) {
        if (pg_query_emscripten_type_guards_1.isPgResTarget(target)) {
            if (pg_query_emscripten_type_guards_1.isPgParamRef(target.ResTarget.val)) {
                params.push({
                    index: target.ResTarget.val.ParamRef.number,
                    location: target.ResTarget.val.ParamRef.location,
                    usedWith: {
                        ...mainRelation,
                        column: target.ResTarget.name,
                        isArray: false,
                    },
                });
            }
        }
        else {
            warnings.push(utils_1.other("Target is not a ResTarget", target));
        }
    }
    if (stmt.UpdateStmt.whereClause) {
        const relations = getRelations(stmt.UpdateStmt.relation);
        if (stmt.UpdateStmt.fromClause) {
            utils_1.assignMap(relations, getRelationsForFromClause(stmt.UpdateStmt.fromClause));
        }
        params.push(...getParamMapForWhereClause(stmt.UpdateStmt.whereClause, relations, warnings));
    }
    return params;
};
exports.getParamMapForUpdate = getParamMapForUpdate;
const getParamMapForInsert = (stmt, warnings) => {
    const params = [];
    const mainRelation = getRelation(stmt.InsertStmt.relation);
    if (pg_query_emscripten_type_guards_1.isPgSelectStmt(stmt.InsertStmt.selectStmt)) {
        const select = stmt.InsertStmt.selectStmt.SelectStmt;
        if (select.valuesLists && stmt.InsertStmt.cols) {
            for (const valueList of select.valuesLists) {
                for (let i = 0; i < valueList.length; i++) {
                    const value = valueList[i];
                    if (pg_query_emscripten_type_guards_1.isPgParamRef(value)) {
                        const column = stmt.InsertStmt.cols[i];
                        if (pg_query_emscripten_type_guards_1.isPgResTarget(column)) {
                            params.push({
                                index: value.ParamRef.number,
                                location: value.ParamRef.location,
                                usedWith: {
                                    ...mainRelation,
                                    column: column.ResTarget.name,
                                    isArray: false,
                                },
                            });
                        }
                        else {
                            warnings.push(utils_1.notSupported("colum type in select clause", column));
                        }
                    }
                }
            }
        }
        else {
            warnings.push(utils_1.notSupported("select clause", select));
        }
    }
    return params;
};
exports.getParamMapForInsert = getParamMapForInsert;
const getParamMapForSelect = (stmt, warnings, parentRelations) => {
    const params = [];
    const relations = new Map();
    utils_1.assignMap(relations, parentRelations, stmt.SelectStmt.fromClause &&
        getRelationsForFromClause(stmt.SelectStmt.fromClause));
    if (stmt.SelectStmt.whereClause) {
        params.push(...getParamMapForWhereClause(stmt.SelectStmt.whereClause, relations, warnings));
    }
    return params;
};
exports.getParamMapForSelect = getParamMapForSelect;
const getParamMapForDelete = (stmt, warnings) => {
    const params = [];
    if (stmt.DeleteStmt.whereClause) {
        const relations = getRelations(stmt.DeleteStmt.relation);
        params.push(...getParamMapForWhereClause(stmt.DeleteStmt.whereClause, relations, warnings));
    }
    return params;
};
exports.getParamMapForDelete = getParamMapForDelete;
//# sourceMappingURL=params.js.map