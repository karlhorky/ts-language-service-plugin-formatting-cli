'use strict';
const typescript_template_language_service_decorator_1 = require('typescript-template-language-service-decorator');
const configuration_1 = require('./configuration');
const language_service_1 = require('./language-service');
const logger_1 = require('./logger');
const substitutions_1 = require('./substitutions');
const type_checker_1 = require('./type-checker');
const type_resolver_1 = require('./type-resolver');
const virtual_service_host_1 = require('./virtual-service-host');
const pluginMarker = Symbol('__sqlTaggedTemplatePluginMarker__');
console.log('>>>> plugin loaded!?');
class SqlTaggedTemplatePlugin {
  constructor(typescript) {
    this.typescript = typescript;
  }
  create(info) {
    if (info.languageService[pluginMarker]) {
      // Already decorated
      return info.languageService;
    }
    const logger = new logger_1.default(info);
    this.config = new configuration_1.ParsedPluginConfiguration(
      info.project,
      logger,
    );
    this.onConfigurationChanged(info.config);
    const virtualServiceHost = new virtual_service_host_1.default(
      this.typescript,
      { strict: true },
      info.project.getCurrentDirectory(),
    );
    const typeChecker = new type_checker_1.TypeChecker(
      this.typescript,
      virtualServiceHost,
    );
    const typeResolver = new type_resolver_1.TypeResolver(this.typescript, () =>
      info.languageService.getProgram().getTypeChecker(),
    );
    const sqlTemplateLanguageService = new language_service_1.default(
      info.project,
      logger,
      this.config,
      typeChecker,
      typeResolver,
    );
    const templateSettings = {
      tags: ['sql'],
      enableForStringWithSubstitutions: true,
      getSubstitutions: substitutions_1.getSubstitutions,
    };
    const languageService = typescript_template_language_service_decorator_1.decorateWithTemplateLanguageService(
      this.typescript,
      info.languageService,
      info.project,
      sqlTemplateLanguageService,
      templateSettings,
      { logger },
    );
    console.log('decorated');
    languageService[pluginMarker] = true;
    return languageService;
  }
  onConfigurationChanged(config) {
    this.config.update(config);
  }
}
const factory = (mod) => new SqlTaggedTemplatePlugin(mod.typescript);
module.exports = factory;
//# sourceMappingURL=index.js.map
