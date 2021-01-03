"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeChecker = void 0;
class TypeChecker {
    constructor(typescript, virtualServiceHost) {
        this.typescript = typescript;
        this.virtualServiceHost = virtualServiceHost;
        this.registry = this.typescript.createDocumentRegistry(true);
        this.service = this.typescript.createLanguageService(virtualServiceHost, this.registry, false);
    }
    check(content) {
        const fileName = `_${Math.floor(Math.random() * 100000)}.ts`;
        return this.virtualServiceHost.withFile(fileName, content, () => this.service.getSemanticDiagnostics(fileName));
    }
}
exports.TypeChecker = TypeChecker;
//# sourceMappingURL=type-checker.js.map