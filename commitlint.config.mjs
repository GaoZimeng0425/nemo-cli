export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'subject-empty': [2, 'never'], // subject不能为空
    'type-empty': [2, 'never'], // type不能为空
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert', 'wip', 'release'],
    ],
    'scope-empty': [1, 'always'], // scop 可选
    'scope-enum': [2, 'always', ['cli', 'git', 'shared', 'utils', 'workspace']],
  },
}
