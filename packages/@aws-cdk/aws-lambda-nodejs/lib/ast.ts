import * as fs from 'fs';
import * as ts from 'typescript';

/**
 * An import statement
 */
interface Import {
  text: string;
  identifiers: string[];
}

/**
 * Creates a source file from a filename
 */
export function createSourceFile(filename: string): ts.SourceFile {
  return ts.createSourceFile(filename, fs.readFileSync(filename, 'utf8'), ts.ScriptTarget.Latest, true);
}

/**
 * Get top level import statements in a source file
 */
export function getImportStatements(sourceFile: ts.SourceFile): Import[] {
  const imports: Import[] = [];
  for (const statement of sourceFile.statements) {
    const importIdentifiers = getImportIdentifiers(statement);
    if (importIdentifiers) {
      imports.push({
        identifiers: importIdentifiers,
        text: statement.getText()
      });
    }
  }
  return imports;
}

function getImportIdentifiers(statement: ts.Statement): string[] | undefined {
  if (ts.isVariableStatement(statement)) { // JS
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.initializer && ts.isCallExpression(declaration.initializer) && declaration.initializer.expression.getText() === 'require') {
        return collectIdentifiersUnder(declaration.name);
      }
    }
  }

  if (ts.isImportDeclaration(statement) || ts.isImportEqualsDeclaration(statement)) { // TS
    return collectIdentifiersUnder(statement);
  }

  return undefined;
}

/**
 * Collects all identifiers under a node
 */
export function collectIdentifiersUnder(node: ts.Node): string[] {
  let identifiers: string[] = [];
  if (ts.isIdentifier(node)) {
    identifiers.push(node.getText());
  }

  for (const child of node.getChildren()) {
    identifiers = identifiers.concat(collectIdentifiersUnder(child));
  }

  return identifiers;
}
