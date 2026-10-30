import stylistic from '@stylistic/eslint-plugin'
import tseslint from 'typescript-eslint'

// code comments are English; Ukrainian lives only in UI texts (docs/conventions.md §3a)
const englishComments = {
  meta: { type: 'suggestion', messages: { cyrillic: 'Write code comments in English: Ukrainian belongs in UI texts only.' } },
  create(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (/\p{Script=Cyrillic}/u.test(comment.value)) {
            context.report({ loc: comment.loc, messageId: 'cyrillic' })
          }
        }
      },
    }
  },
}

// a thin layer for the two style rules Biome 2.6 lacks (docs/conventions.md §3a); Biome stays the linter and formatter
export default tseslint.config(
  { ignores: ['.next/**', 'node_modules/**', 'src/types/database.types.ts', 'e2e/.auth/**'] },
  {
    files: ['src/**/*.{ts,tsx}', 'e2e/**/*.ts', '*.config.{ts,mjs,cjs}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { '@stylistic': stylistic, saldo: { rules: { 'english-comments': englishComments } } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      'saldo/english-comments': 'error',
      // cn: the shadcn `cn` package's own export name
      'id-length': ['error', { min: 3, properties: 'never', exceptions: ['id', 'cn'], exceptionPatterns: ['^_'] }],
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: ['const', 'let'], next: '*' },
        { blankLine: 'any', prev: ['const', 'let'], next: ['const', 'let'] },
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'try', 'switch'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'try', 'switch'], next: '*' },
      ],
    },
  },
)
