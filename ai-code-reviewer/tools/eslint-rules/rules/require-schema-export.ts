/**
 * This file sets you up with structure needed for an ESLint rule.
 *
 * It leverages utilities from @typescript-eslint to allow TypeScript to
 * provide autocompletions etc for the configuration.
 *
 * Your rule's custom logic will live within the create() method below
 * and you can learn more about writing ESLint rules on the official guide:
 *
 * https://eslint.org/docs/developer-guide/working-with-rules
 *
 * You can also view many examples of existing rules here:
 *
 * https://github.com/typescript-eslint/typescript-eslint/tree/master/packages/eslint-plugin/src/rules
 */

import { ESLintUtils } from '@typescript-eslint/utils';
import * as fs from 'fs';
import * as path from 'path';

export const RULE_NAME = 'require-schema-export';

export const rule = ESLintUtils.RuleCreator(() => __filename)({
  name: RULE_NAME,
  meta: {
    type: 'problem',
    docs: {
      description: `Ensures every interface in @ai-code-reviewer/types has a corresponding Zod schema in @ai-code-reviewer/schemas`,
    },
    schema: [],
    messages: {
      missingSchema: "Interface '{{ name }}' must have a corresponding '{{ name }}Schema' exported in packages/schemas.",
    },
  },
  defaultOptions: [],
  create(context) {
    // Only run this rule on files inside packages/types
    if (!context.getFilename().replace(/\\/g, '/').includes('packages/types')) {
      return {};
    }

    return {
      ExportNamedDeclaration(node) {
        if (node.declaration && node.declaration.type === 'TSInterfaceDeclaration') {
          const interfaceName = node.declaration.id.name;
          const schemaName = `${interfaceName}Schema`;
          
          // Assuming standard Nx monorepo structure
          const schemasDir = path.resolve(__dirname, '../../../packages/schemas/src');
          if (fs.existsSync(schemasDir)) {
            const files = fs.readdirSync(schemasDir).filter(f => f.endsWith('.ts'));
            let found = false;
            for (const file of files) {
              const content = fs.readFileSync(path.join(schemasDir, file), 'utf-8');
              if (content.includes(`export const ${schemaName}`)) {
                found = true;
                break;
              }
            }
            if (!found) {
              context.report({
                node: node.declaration.id,
                messageId: 'missingSchema',
                data: {
                  name: interfaceName
                }
              });
            }
          }
        }
      }
    };
  },
});
