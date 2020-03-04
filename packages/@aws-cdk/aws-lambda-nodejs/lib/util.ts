import * as fs from 'fs';

// From https://github.com/errwischt/stacktrace-parser/blob/master/src/stack-trace-parser.js
const STACK_RE = /^\s*at (?:((?:\[object object\])?[^\\/]+(?: \[as \S+\])?) )?\(?(.*?):(\d+)(?::(\d+))?\)?\s*$/i;

/**
 * A parsed stack trace line
 */
export interface StackTrace {
  readonly file: string;
  readonly methodName?: string;
  readonly lineNumber: number;
  readonly column: number;
}

/**
 * Parses the stack trace of an error
 */
export function parseStackTrace(error?: Error): StackTrace[] {
  const err = error || new Error();

  if (!err.stack) {
    return [];
  }

  const lines = err.stack.split('\n');

  const stackTrace: StackTrace[] = [];

  for (const line of lines) {
    const results = STACK_RE.exec(line);
    if (results) {
      stackTrace.push({
        file: results[2],
        methodName: results[1],
        lineNumber: parseInt(results[3], 10),
        column: parseInt(results[4], 10),
      });
    }
  }

  return stackTrace;
}

/**
 * Returns the major version of node installation
 */
export function nodeMajorVersion(): number {
  return parseInt(process.versions.node.split('.')[0], 10);
}

/**
 * Finds closest package.json path
 */
export function findPkgPath(): string {
  let pkgPath;

  for (const path of module.paths) {
    pkgPath = path.replace(/node_modules$/, 'package.json');
    if (fs.existsSync(pkgPath)) {
      break;
    }
  }

  if (!pkgPath) {
    throw new Error('Cannot find a `package.json` file.');
  }

  return pkgPath;
}

/**
 * Counts items in a list
 */
export function countItems(list: string[]): { [item: string]: number } {
  const ret: { [identifier: string]: number } = {};
  for (const item of list) {
    if (ret[item]) {
      ret[item] += 1;
    } else {
      ret[item] = 1;
    }
  }

  return ret;
}
