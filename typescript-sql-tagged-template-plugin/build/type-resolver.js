"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeResolver = void 0;
const BUILT_IN_TYPES = new Set([
    "ArrayBuffer",
    "Buffer",
    "BigInt",
    "Boolean",
    "Date",
    "Number",
    "Object",
    "String",
]);
const isBuiltInType = (simpleTypeName) => BUILT_IN_TYPES.has(simpleTypeName);
const getSymbolTableValues = (table) => {
    const values = [];
    const iter = table.values();
    for (let next = iter.next(); !next.done; next = iter.next()) {
        values.push(next.value);
    }
    return values;
};
const getSimpleTypeName = (typescript, checker, type) => checker.typeToString(type, undefined, typescript.TypeFormatFlags.InTypeAlias |
    typescript.TypeFormatFlags.NoTruncation);
const getUnionOrIntersectionTypeName = (typescript, checker, type, seenTypes, resolvedTypes) => type.types
    .map((type) => getTypeName(typescript, checker, type, seenTypes, resolvedTypes))
    .join(type.isUnion() ? " | " : " & ");
const getTypeArgumentNames = (typescript, checker, type, seenTypes, resolvedTypes) => {
    if (type.flags & typescript.TypeFlags.Object) {
        const otype = type;
        if (otype.objectFlags & typescript.ObjectFlags.Reference) {
            const rtype = type;
            if (rtype.typeArguments) {
                return rtype.typeArguments.map((arg) => getTypeName(typescript, checker, arg, seenTypes, resolvedTypes));
            }
        }
    }
    return [];
};
const getTypeName = (typescript, checker, type, seenTypes, resolvedTypes) => {
    let resolvedType = resolvedTypes.get(type);
    if (resolvedType) {
        return resolvedType;
    }
    if (seenTypes.has(type)) {
        return "CIRCULAR_REFERENCE";
    }
    seenTypes.add(type);
    const simpleTypeName = getSimpleTypeName(typescript, checker, type);
    if (isBuiltInType(simpleTypeName)) {
        resolvedType = simpleTypeName;
    }
    else if (type.symbol &&
        type.symbol.flags & typescript.SymbolFlags.Interface &&
        type.symbol.escapedName === "Array") {
        const typeArgumentNames = getTypeArgumentNames(typescript, checker, type, seenTypes, resolvedTypes);
        resolvedType = `Array<${typeArgumentNames.join(", ")}>`;
    }
    else if (type.symbol &&
        (type.symbol.flags & typescript.SymbolFlags.Interface ||
            type.symbol.flags & typescript.SymbolFlags.TypeLiteral)) {
        const typeArgumentNames = getTypeArgumentNames(typescript, checker, type, seenTypes, resolvedTypes);
        let name = "{ ";
        if (type.symbol.members) {
            const members = getSymbolTableValues(type.symbol.members);
            const typeParamTypes = members
                .filter((member) => member.flags & typescript.SymbolFlags.TypeParameter)
                .map((member, i) => [
                member.escapedName,
                typeArgumentNames[i],
            ])
                .reduce((acc, [name, type]) => ({ ...acc, [name]: type }), {});
            for (const member of members.filter((member) => member.flags & typescript.SymbolFlags.Property)) {
                let memberType = getNodeTypeName(typescript, checker, member.valueDeclaration, seenTypes, resolvedTypes);
                if (typeParamTypes[memberType]) {
                    memberType = typeParamTypes[memberType];
                }
                name += `${member.escapedName}: ${memberType}; `;
            }
        }
        name += "}";
        resolvedType = name;
    }
    else if (type.isUnionOrIntersection()) {
        resolvedType = getUnionOrIntersectionTypeName(typescript, checker, type, seenTypes, resolvedTypes);
    }
    else {
        resolvedType = simpleTypeName;
    }
    resolvedTypes.set(type, resolvedType);
    return resolvedType;
};
const getNodeTypeName = (typescript, checker, node, seenTypes, resolvedTypes) => {
    const type = checker.getTypeAtLocation(node);
    return getTypeName(typescript, checker, type, seenTypes, resolvedTypes);
};
class TypeResolver {
    constructor(typescript, getTypeChecker) {
        this.typescript = typescript;
        this.getTypeChecker = getTypeChecker;
    }
    getType(node) {
        const checker = this.getTypeChecker();
        return getNodeTypeName(this.typescript, checker, node, new Set(), new Map());
    }
}
exports.TypeResolver = TypeResolver;
//# sourceMappingURL=type-resolver.js.map