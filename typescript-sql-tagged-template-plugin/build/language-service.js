"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const analysis_1 = require("./analysis");
const config_1 = require("./config");
const formatting_1 = require("./formatting");
const utils_1 = require("./utils");
const diagnosticMessageCodes = [100000, 100001, 100002, 100003];
const diagnosticMessages = {
    100000: {
        messageText: (e) => `Failed to parse: ${e.message}.`,
        category: "Error",
    },
    100001: {
        messageText: (e) => `Failed to parse: ${e.message}.`,
        category: "Error",
    },
    100002: {
        messageText: (p) => `Cannot find type for parameter ${stringifyParameter(p)} in schema.`,
        category: "Error",
    },
    100003: {
        messageText: (originalMessage) => `There was an issue type checking this expression. Original error: ${originalMessage}`,
        category: "Warning",
    },
};
const unsupportedTypeScriptErrors = new Set([
    // "Cannot find name '{0}'."
    // The plugin tries to resolve all type names and create a literal type.
    // This type is then checked against the type from the DB schema. If we get
    // this error, it most likely means not all type names were resolved
    // correctly.
    2304,
]);
const getTemplateExpressions = (typescript, node) => typescript.isTemplateExpression(node)
    ? node.templateSpans.map((span) => span.expression)
    : [];
const getTemplateLiterals = (typescript, node) => typescript.isTemplateExpression(node)
    ? [node.head, ...node.templateSpans.map((span) => span.literal)]
    : [node];
const getNodePosition = (node, context) => {
    const file = context.node.getSourceFile();
    return {
        start: node.getStart(file) - context.node.getStart(file) - 1,
        length: node.getWidth(file),
    };
};
const getTemplateLiteralTextPosition = (literal, context) => {
    const span = getNodePosition(literal, context);
    // Template literal nodes contain the start and end tokens
    // of template literals and template expressions (`, ${ and
    // }). We don't want to replace those, so we need to remove
    // them from the span.
    if (context.typescript.isNoSubstitutionTemplateLiteral(literal) ||
        context.typescript.isTemplateTail(literal)) {
        span.start += 1;
        span.length -= 2;
    }
    else {
        span.start += 1;
        span.length -= 3;
    }
    return span;
};
const stringifyParameter = (parameter) => {
    var _a;
    return [
        parameter.usedWith.schema,
        parameter.usedWith.table,
        parameter.usedWith.column,
        (_a = parameter.usedWith.jsonPath) === null || _a === void 0 ? void 0 : _a.path,
    ]
        .filter((x) => x)
        .join(".");
};
const getParameterType = (parameter, schemaJson, defaultSchemaName) => {
    var _a, _b, _c;
    const schema = (_a = parameter.usedWith.schema) !== null && _a !== void 0 ? _a : defaultSchemaName;
    const dbSchema = schemaJson[schema];
    const dbTable = dbSchema === null || dbSchema === void 0 ? void 0 : dbSchema[parameter.usedWith.table];
    const dbColumn = dbTable === null || dbTable === void 0 ? void 0 : dbTable[parameter.usedWith.column];
    if (dbColumn) {
        const type = ((_c = (_b = parameter.usedWith.jsonPath) === null || _b === void 0 ? void 0 : _b.isText) !== null && _c !== void 0 ? _c : false) ? "string | null"
            : dbColumn;
        return parameter.usedWith.isArray ? `Array<${type}>` : type;
    }
};
const getDiagnosticFactory = (context) => {
    const file = context.node.getSourceFile();
    const source = config_1.pluginName;
    const any = ({ code, messageText, category, start, length, }) => ({
        code,
        messageText,
        category,
        start,
        length,
        file,
        source,
    });
    const own = (code, arg, pos) => any({
        code,
        messageText: diagnosticMessages[code].messageText(arg),
        category: context.typescript.DiagnosticCategory[diagnosticMessages[code].category],
        ...pos,
    });
    const pos = (expression) => getNodePosition(expression, context);
    return {
        any,
        own,
        pos,
    };
};
class SqlTemplateLanguageService {
    constructor(project, logger, config, typeChecker, typeResolver) {
        this.project = project;
        this.logger = logger;
        this.config = config;
        this.typeChecker = typeChecker;
        this.typeResolver = typeResolver;
    }
    getSemanticDiagnostics(context) {
        if (!this.config.enableDiagnostics) {
            return [];
        }
        const factory = getDiagnosticFactory(context);
        let analysis;
        try {
            analysis = analysis_1.analyze(context.text);
        }
        catch (e) {
            return e instanceof analysis_1.ParseError
                ? [
                    factory.own(100001, e, {
                        start: e.cursorPosition - 1,
                        length: 1,
                    }),
                ]
                : [
                    factory.own(100000, e, {
                        start: 0,
                        length: context.text.length,
                    }),
                ];
        }
        for (const warning of analysis.warnings) {
            this.logger.log(`Warning analyzing template in file ${context.fileName}: ${warning}`);
        }
        const schema = this.config.schema;
        if (!schema) {
            this.logger.log("skip type checks because no schema configured");
            return [];
        }
        const expressions = getTemplateExpressions(context.typescript, context.node);
        const diagnostics = analysis.parameters
            .filter((parameter) => expressions.length >= parameter.index)
            .map((parameter) => ({
            expression: expressions[parameter.index - 1],
            parameter,
        }))
            .map(({ expression, parameter }) => {
            const parameterType = getParameterType(parameter, schema, this.config.defaultSchemaName);
            if (!parameterType) {
                return [
                    factory.own(100002, parameter, factory.pos(expression)),
                ];
            }
            const expressionType = this.typeResolver.getType(expression);
            const content = `{ let expr: ${expressionType} = null as any; let param: ${parameterType} = expr; }`;
            return this.typeChecker.check(content).map((diagnostic) => unsupportedTypeScriptErrors.has(diagnostic.code)
                ? factory.own(100003, diagnostic.messageText, factory.pos(expression))
                : factory.any({
                    code: diagnostic.code,
                    messageText: diagnostic.messageText,
                    category: diagnostic.category,
                    ...factory.pos(expression),
                }));
        });
        return utils_1.flatten(diagnostics);
    }
    getFormattingEditsForDocument() {
        console.log('###################### getFormattingEditsForDocument')
    }
    getFormattingEditsForRange(context, _start, _end, settings) {
        console.log('getFormattingEditsForRange')
        if (!this.config.enableFormat) {
            return [];
        }
        const scriptInfo = this.project.getScriptInfo(context.fileName);
        if (!scriptInfo) {
            this.logger.log("skip formatting because ScriptInfo is undefined");
            return [];
        }
        const text = context.text;
        const lineIndent = formatting_1.getLineIndentationByNode(context.node, scriptInfo, settings);
        try {
            const formatted = formatting_1.formatSql({
                sql: text,
                formatOptions: settings,
                pgFormatterConfigFile: this.config.pgFormatterConfigFile,
            });
            const formattedAndIndented = formatting_1.indentForTemplateLiteral({
                text: formatted,
                formatOptions: settings,
                lineIndent,
            });
            if (formattedAndIndented !== text) {
                const literals = getTemplateLiterals(context.typescript, context.node);
                const parts = formatting_1.splitSqlByParameters(formattedAndIndented, literals.length - 1);
                return parts.map((newText, index) => {
                    const literal = literals[index];
                    const span = getTemplateLiteralTextPosition(literal, context);
                    return { span, newText };
                });
            }
        }
        catch (err) {
            this.logger.log(`error formatting SQL: ${err.message}`);
        }
        return [];
    }
}
exports.default = SqlTemplateLanguageService;
//# sourceMappingURL=language-service.js.map