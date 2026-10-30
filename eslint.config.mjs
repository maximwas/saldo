import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

// code comments are English; Ukrainian lives only in UI texts (docs/conventions.md §3a)
const englishComments = {
  meta: {
    type: 'suggestion',
    messages: { cyrillic: 'Write code comments in English: Ukrainian belongs in UI texts only.' },
  },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (/\p{Script=Cyrillic}/u.test(comment.value)) {
            context.report({
              loc: comment.loc,
              messageId: 'cyrillic',
            })
          }
        }
      },
    }
  },
}

// a thin layer for the style rules Biome 2.6 lacks (docs/conventions.md §3a); Biome stays the linter and formatter
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'src/types/database.types.ts', 'e2e/.auth/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', '*.{ts,mjs}', '.dependency-cruiser.cjs', 'scripts/**/*.mjs'],
    languageOptions: { parser: tseslint.parser },
    plugins: {
      '@stylistic': stylistic,
      saldo: { rules: { 'english-comments': englishComments } },
    },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'saldo/english-comments': 'error',
      // cn: the shadcn `cn` package's own export name
      'id-length': [
        'error',
        {
          min: 3,
          properties: 'never',
          exceptions: ['id', 'cn'],
          exceptionPatterns: ['^_'],
        },
      ],
      '@stylistic/padding-line-between-statements': [
        'error',
        {
          blankLine: 'always',
          prev: '*',
          next: 'return',
        },
        {
          blankLine: 'always',
          prev: ['const', 'let'],
          next: '*',
        },
        {
          blankLine: 'any',
          prev: ['const', 'let'],
          next: ['const', 'let'],
        },
        {
          blankLine: 'always',
          prev: '*',
          next: ['if', 'for', 'while', 'try', 'switch'],
        },
        {
          blankLine: 'always',
          prev: ['if', 'for', 'while', 'try', 'switch'],
          next: '*',
        },
      ],
      // one property per line once an object or object type has two members; Biome keeps them expanded (expand: auto)
      '@stylistic/object-curly-newline': [
        'error',
        {
          ObjectExpression: {
            minProperties: 2,
            consistent: true,
          },
          TSTypeLiteral: {
            minProperties: 2,
            consistent: true,
          },
          TSInterfaceBody: {
            minProperties: 2,
            consistent: true,
          },
        },
      ],
      '@stylistic/object-property-newline': 'error',
      // Biome hugs a sole parameter and collapses its inline object type, so multi-member parameter types get a name
      'no-restricted-syntax': [
        'error',
        {
          selector:
            ':function > :matches(Identifier, ObjectPattern) > TSTypeAnnotation > TSTypeLiteral[members.length>1]',
          message:
            'Name the parameter type (type FooProps = { ... }): Biome collapses inline object types in parameters.',
        },
      ],
    },
  },
)
