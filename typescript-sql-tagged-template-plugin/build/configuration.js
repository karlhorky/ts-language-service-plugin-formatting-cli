"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParsedPluginConfiguration = void 0;
const path_1 = require("path");
const formatting_1 = require("./formatting");
const schema_1 = require("./schema");
const defaults = {
    enableDiagnostics: true,
    enableFormat: true,
    defaultSchemaName: "public",
};
class ParsedPluginConfiguration {
    constructor(project, logger) {
        this.project = project;
        this.logger = logger;
        this.enableDiagnostics = defaults.enableDiagnostics;
        this.enableFormat = defaults.enableFormat;
        this.defaultSchemaName = defaults.defaultSchemaName;
    }
    update(config) {
        var _a, _b;
        this.logger.log("new config: " + JSON.stringify(config));
        this.enableDiagnostics = (_a = config.enableDiagnostics) !== null && _a !== void 0 ? _a : defaults.enableDiagnostics;
        this.enableFormat = (_b = config.enableFormat) !== null && _b !== void 0 ? _b : defaults.enableFormat;
        if (this.enableFormat && !formatting_1.detectPerl()) {
            this.logger.log("could not find Perl in PATH; disabling format");
            this.enableFormat = false;
        }
        this.schema = undefined;
        if (config.schemaFile) {
            const fullPath = path_1.resolve(this.project.getCurrentDirectory(), config.schemaFile);
            this.logger.log(`reading schema file from: ${fullPath}`);
            const content = this.project.readFile(fullPath);
            if (content) {
                try {
                    this.schema = schema_1.parseSchema(content);
                }
                catch (e) {
                    this.logger.log(`error parsing schema file: ${e.message}`);
                }
            }
        }
        this.defaultSchemaName =
            config.defaultSchemaName || defaults.defaultSchemaName;
        this.pgFormatterConfigFile = config.pgFormatterConfigFile
            ? path_1.resolve(this.project.getCurrentDirectory(), config.pgFormatterConfigFile)
            : undefined;
    }
}
exports.ParsedPluginConfiguration = ParsedPluginConfiguration;
//# sourceMappingURL=configuration.js.map