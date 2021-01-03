"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class VirtualServiceHost {
    constructor(typescript, compilerOptions, workspacePath) {
        this.typescript = typescript;
        this.compilerOptions = compilerOptions;
        this.workspacePath = workspacePath;
        this.files = new Map();
    }
    withFile(fileName, content, callback) {
        this.files.set(fileName, content);
        const result = callback();
        this.files.delete(fileName);
        return result;
    }
    getCompilationSettings() {
        return this.compilerOptions;
    }
    getScriptFileNames() {
        return Array.from(this.files.keys());
    }
    getScriptKind() {
        return this.typescript.ScriptKind.TS;
    }
    getScriptVersion() {
        return "0";
    }
    getScriptSnapshot(fileName) {
        const fileText = fileName.includes("node_modules")
            ? this.typescript.sys.readFile(fileName)
            : this.files.get(fileName);
        if (fileText) {
            return this.typescript.ScriptSnapshot.fromString(fileText);
        }
    }
    getCurrentDirectory() {
        return this.workspacePath;
    }
    getDefaultLibFileName(options) {
        return this.typescript.getDefaultLibFilePath(options);
    }
    useCaseSensitiveFileNames() {
        return true;
    }
}
exports.default = VirtualServiceHost;
//# sourceMappingURL=virtual-service-host.js.map