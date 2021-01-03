"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLineIndentationByNode = exports.indentForTemplateLiteral = exports.splitSqlByParameters = exports.formatSql = exports.detectPerl = void 0;
const child_process_1 = require("child_process");
const path_1 = require("path");
const analysis_1 = require("./analysis");
const DEFAULT_TAB_SIZE = 4;
const DEFAULT_INDENT_SIZE = 4;
const DEFAULT_NEW_LINE_CHARACTER = "\n";
const PG_FORMATTER_PATH = path_1.resolve(__dirname, "../vendor/pgFormatter/pg_format");
const detectPerl = () => {
    const proc = child_process_1.spawnSync("perl", ["-v"]);
    return proc.status === 0;
};
exports.detectPerl = detectPerl;
const formatSql = ({ sql, formatOptions, pgFormatterConfigFile, }) => {
    var _a, _b, _c;
    const useSpaces = (_a = formatOptions.convertTabsToSpaces) !== null && _a !== void 0 ? _a : false;
    const indentSize = (_b = formatOptions.indentSize) !== null && _b !== void 0 ? _b : DEFAULT_INDENT_SIZE;
    const proc = child_process_1.spawnSync("perl", [
        PG_FORMATTER_PATH,
        ...(pgFormatterConfigFile
            ? ["--config", pgFormatterConfigFile]
            : ["--no-rcfile"]),
        ...(useSpaces ? ["--spaces", indentSize.toString()] : ["--tabs"]),
    ], {
        encoding: "utf8",
        input: sql,
    });
    if (proc.error) {
        throw new Error(`pgFormatter failed: ${proc.error.message}`);
    }
    if (proc.status !== 0) {
        throw new Error(`pgFormatter exited with ${proc.status}: ${proc.stderr}`);
    }
    return proc.stdout.replace(/(\r\n|\r|\n)/g, (_c = formatOptions.newLineCharacter) !== null && _c !== void 0 ? _c : DEFAULT_NEW_LINE_CHARACTER);
};
exports.formatSql = formatSql;
const splitSqlByParameters = (sql, numberOfParameters) => {
    const analysis = analysis_1.analyze(sql);
    const parameters = analysis.parameters
        .filter((parameter) => parameter.index <= numberOfParameters)
        // Remove duplicate indexes (e.g. two times $1) and keep only the
        // parameter that occurs first.
        .sort((a, b) => {
        const byIndex = a.index - b.index;
        if (byIndex !== 0) {
            return byIndex;
        }
        return a.location - b.location;
    })
        .filter((parameter, index, array) => index === 0 || array[index - 1].index !== parameter.index)
        // Sort by location
        .sort((a, b) => a.location - b.location);
    if (parameters.length !== numberOfParameters) {
        throw new Error(`SQL does not contain expected number of parameters (expected: ${numberOfParameters}, actual: ${parameters.length})`);
    }
    const parts = [];
    let end = 0;
    for (const parameter of parameters) {
        const pText = "$" + parameter.index;
        parts.push(sql.substring(end, parameter.location));
        end = parameter.location + pText.length;
    }
    parts.push(sql.substring(end));
    return parts;
};
exports.splitSqlByParameters = splitSqlByParameters;
const indentForTemplateLiteral = ({ text, formatOptions, lineIndent, }) => {
    var _a, _b, _c, _d;
    const useSpaces = (_a = formatOptions.convertTabsToSpaces) !== null && _a !== void 0 ? _a : false;
    const indentSize = (_b = formatOptions.indentSize) !== null && _b !== void 0 ? _b : DEFAULT_INDENT_SIZE;
    const tabSize = (_c = formatOptions.tabSize) !== null && _c !== void 0 ? _c : DEFAULT_TAB_SIZE;
    const newLineCharacter = (_d = formatOptions.newLineCharacter) !== null && _d !== void 0 ? _d : DEFAULT_NEW_LINE_CHARACTER;
    return (newLineCharacter +
        text
            .split(newLineCharacter)
            .map((line, index, array) => {
            const isLast = index + 1 === array.length;
            const indent = isLast ? lineIndent : lineIndent + indentSize;
            const indentStr = useSpaces
                ? " ".repeat(indent)
                : "\t".repeat(Math.ceil(indent / tabSize));
            return indentStr + line;
        })
            .join(newLineCharacter));
};
exports.indentForTemplateLiteral = indentForTemplateLiteral;
const getLineIndentationByNode = (node, scriptInfo, formatOptions) => {
    var _a;
    const { line } = scriptInfo.positionToLineOffset(node.getStart(node.getSourceFile()));
    const lineSpan = scriptInfo.lineToTextSpan(line - 1);
    const lineText = scriptInfo
        .getSnapshot()
        .getText(lineSpan.start, lineSpan.start + lineSpan.length);
    // This logic is copied from:
    // https://github.com/microsoft/TypeScript/blob/ee570402769c3392d82a746fdf1416e4ce96304d/src/server/session.ts#L1728-1740
    let lineIndent = 0;
    for (let i = 0; i < lineText.length; i++) {
        if (lineText.charAt(i) === " ") {
            lineIndent++;
        }
        else if (lineText.charAt(i) === "\t") {
            lineIndent += (_a = formatOptions.tabSize) !== null && _a !== void 0 ? _a : DEFAULT_TAB_SIZE;
        }
        else {
            break;
        }
    }
    return lineIndent;
};
exports.getLineIndentationByNode = getLineIndentationByNode;
//# sourceMappingURL=formatting.js.map