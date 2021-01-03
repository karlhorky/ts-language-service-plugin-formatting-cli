// Usage: node ./apply-all-import-fixes.js ./path/to/index.ts
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript/lib/tsserverlibrary';

class Logger implements ts.server.Logger {
  // tslint:disable-line no-unnecessary-qualifier
  private fd = -1;
  private seq = 0;
  private inGroup = false;
  private firstInGroup = true;

  constructor(
    private readonly logFilename: string,
    private readonly traceToConsole: boolean,
    private readonly level: ts.server.LogLevel,
  ) {
    if (this.logFilename) {
      try {
        this.fd = fs.openSync(this.logFilename, 'w');
      } catch (_) {
        // swallow the error and keep logging disabled if file cannot be opened
      }
    }
  }

  static padStringRight(str: string, padding: string) {
    return (str + padding).slice(0, padding.length);
  }

  close() {
    if (this.fd >= 0) {
      fs.close(this.fd, () => void 0);
    }
  }

  getLogFileName() {
    return this.logFilename;
  }

  perftrc(s: string) {
    this.msg(s, ts.server.Msg.Perf);
  }

  info(s: string) {
    // this.msg(s, ts.server.Msg.Info);
  }

  err(s: string) {
    this.msg(s, ts.server.Msg.Err);
  }

  startGroup() {
    this.inGroup = true;
    this.firstInGroup = true;
  }

  endGroup() {
    this.inGroup = false;
  }

  loggingEnabled() {
    return !!this.logFilename || this.traceToConsole;
  }

  hasLevel(level: ts.server.LogLevel) {
    return this.loggingEnabled() && this.level >= level;
  }

  msg(s: string, type: ts.server.Msg = ts.server.Msg.Err) {
    if (!this.canWrite) return;

    s = `[${new Date().getUTCDate()}] ${s}\n`;
    if (!this.inGroup || this.firstInGroup) {
      const prefix = Logger.padStringRight(
        type + ' ' + this.seq.toString(),
        '          ',
      );
      s = prefix + s;
    }
    this.write(s);
    if (!this.inGroup) {
      this.seq++;
    }
  }

  private get canWrite() {
    return this.fd >= 0 || this.traceToConsole;
  }

  private write(s: string) {
    if (this.fd >= 0) {
      const buf = Buffer.from(s);
      // tslint:disable-next-line no-null-keyword
      fs.writeSync(this.fd, buf, 0, buf.length, /*position*/ null!); // TODO: GH#18217
    }
    if (this.traceToConsole) {
      console.warn(s);
    }
  }
}

const projectService = new ts.server.ProjectService({
  host: ts.sys as ts.server.ServerHost,
  typingsInstaller: ts.server.nullTypingsInstaller,
  logger: new Logger('./log.log', true, ts.server.LogLevel.normal),
  cancellationToken: ts.server.nullCancellationToken,
  useInferredProjectPerProjectRoot: true,
  useSingleInferredProject: false,
});
projectService.openClientFile(path.join(process.cwd(), process.argv[2]));
const next = projectService.configuredProjects.values().next();
const next2 = projectService.configuredProjects.values().next();
// console.log(next);
// console.log(projectService.configuredProjects.values().next().value);
const lshost = projectService.configuredProjects.values().next().value;
const ls = lshost.getLanguageService(true);
const formatSettings = ts.getDefaultFormatCodeSettings('\n');

console.log('symbol present?', ls[Symbol('__sqlTaggedTemplatePluginMarker__')]);
for (const file of ls.getProgram().getSourceFiles()) {
  if (file.fileName.includes('src/abc.ts')) {
    let text = file.getText();
    var edits = ls.getFormattingEditsForDocument(file.fileName, {
      baseIndentSize: 0,
      indentSize: 4,
      tabSize: 4,
      indentStyle: ts.IndentStyle.Smart,
      newLineCharacter: '\r\n',
      convertTabsToSpaces: true,
      insertSpaceAfterCommaDelimiter: true,
      insertSpaceAfterSemicolonInForStatements: true,
      insertSpaceBeforeAndAfterBinaryOperators: true,
      insertSpaceAfterConstructor: false,
      insertSpaceAfterKeywordsInControlFlowStatements: true,
      insertSpaceAfterFunctionKeywordForAnonymousFunctions: false,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyParenthesis: false,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBrackets: false,
      insertSpaceAfterOpeningAndBeforeClosingNonemptyBraces: true,
      insertSpaceAfterOpeningAndBeforeClosingTemplateStringBraces: false,
      insertSpaceAfterOpeningAndBeforeClosingJsxExpressionBraces: false,
      insertSpaceAfterTypeAssertion: false,
      insertSpaceBeforeFunctionParenthesis: false,
      placeOpenBraceOnNewLineForFunctions: false,
      placeOpenBraceOnNewLineForControlBlocks: false,
      insertSpaceBeforeTypeAnnotation: false,
    });
    edits
      .sort(function (a, b) {
        return a.span.start - b.span.start;
      })
      .reverse()
      .forEach(function (edit) {
        var head = text.slice(0, edit.span.start);
        var tail = text.slice(edit.span.start + edit.span.length);
        text = '' + head + edit.newText + tail;
      });
    console.log('text after edits', text);
  }

  // const diags = ls.getSemanticDiagnostics(file.fileName);
  // const allfixes: ts.FileTextChanges[] = [];
  // for (const diag of diags) {
  //   if (diag.code !== 2304) continue; // Code for "cannot find name" errors
  //   const fixes = ls.getCodeFixesAtPosition(
  //     file.fileName,
  //     diag.start,
  //     diag.start + diag.length,
  //     [diag.code],
  //     formatSettings,
  //     { quotePreference: 'double' },
  //   );
  //   const fix = fixes[0];
  //   allfixes.push(...fix.changes);
  // }
  // const newFileContent = applyEdits(file.text, file.fileName, allfixes);
  // fs.writeFileSync(file.fileName, newFileContent);
}

function applyEdits(
  text: string,
  textFilename: string,
  edits: ReadonlyArray<ts.FileTextChanges>,
): string {
  for (const { fileName, textChanges } of edits) {
    if (fileName !== textFilename) {
      continue;
    }

    for (let i = textChanges.length - 1; i >= 0; i--) {
      const {
        newText,
        span: { start, length },
      } = textChanges[i];
      text = text.slice(0, start) + newText + text.slice(start + length);
    }
  }

  return text;
}
