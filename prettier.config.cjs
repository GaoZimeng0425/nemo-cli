// @ts-check
/**
 * @type {import('prettier').Options}
 */
module.exports = {
  tabWidth: 2,
  bracketSpacing: true,
  printWidth: 100,
  proseWrap: 'never',
  requirePragma: false,
  useTabs: false,
  singleQuote: true,
  semi: false,
  trailingComma: 'none',
  parser: 'typescript',
  plugins: [],
  overrides: [
    {
      files: '*.html',
      options: {
        parser: 'html',
        attributeSeparator: 'always',
        singleQuote: false
      }
    },
    {
      files: ['.prettierrc', '*.json'],
      options: {
        parser: 'json',
        printWidth: 100
      }
    },
    {
      files: '*.md',
      options: {
        parser: 'markdown'
      }
    },
    {
      files: '*.json5',
      options: {
        parser: 'json5',
        printWidth: 100
      }
    }
  ]
}
