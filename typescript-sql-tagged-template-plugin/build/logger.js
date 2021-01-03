"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
class default_1 {
    constructor(info) {
        this.info = info;
    }
    log(msg) {
        this.info.project.projectService.logger.info(`[${config_1.pluginName}] ${msg}`);
    }
}
exports.default = default_1;
//# sourceMappingURL=logger.js.map