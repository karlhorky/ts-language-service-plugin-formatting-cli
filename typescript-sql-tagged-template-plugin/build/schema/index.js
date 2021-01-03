"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseSchema = void 0;
const isColumnDefinition = (obj) => typeof obj === "string";
const isTableDefinition = (obj) => typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).every((key) => isColumnDefinition(obj[key]));
const isSchemaDefinition = (obj) => typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).every((key) => isTableDefinition(obj[key]));
const isDatabaseSchema = (obj) => typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj).every((key) => isSchemaDefinition(obj[key]));
const parseSchema = (json) => {
    const obj = JSON.parse(json);
    if (!isDatabaseSchema(obj)) {
        throw new Error("Schema does not conform to database schema type");
    }
    return obj;
};
exports.parseSchema = parseSchema;
//# sourceMappingURL=index.js.map