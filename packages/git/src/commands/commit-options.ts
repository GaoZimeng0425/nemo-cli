const commitScopeOptions = [
  {
    value: 'app',
    label: 'app',
  },
  {
    value: 'shared',
    label: 'shared',
  },
  {
    value: 'server',
    label: 'server',
  },
  {
    value: 'tools',
    label: 'tools',
  },
  {
    value: '',
    label: 'none',
  },
]
const commitTypeOptions = [
  {
    value: 'feat',
    label: 'feat',
    hint: 'A new feature',
    emoji: '🌟',
    trailer: 'Changelog: feature',
  },
  {
    value: 'fix',
    label: 'fix',
    hint: 'A bug fix',
    emoji: '🐛',
    trailer: 'Changelog: fix',
  },
  {
    value: 'docs',
    label: 'docs',
    hint: 'Documentation only changes',
    emoji: '📚',
    trailer: 'Changelog: documentation',
  },
  {
    value: 'refactor',
    label: 'refactor',
    hint: 'A code change that neither fixes a bug nor adds a feature',
    emoji: '🔨',
    trailer: 'Changelog: refactor',
  },
  {
    value: 'perf',
    label: 'perf',
    hint: 'A code change that improves performance',
    emoji: '🚀',
    trailer: 'Changelog: performance',
  },
  {
    value: 'test',
    label: 'test',
    hint: 'Adding missing tests or correcting existing tests',
    emoji: '🚨',
    trailer: 'Changelog: test',
  },
  {
    value: 'build',
    label: 'build',
    hint: 'Changes that affect the build system or external dependencies',
    emoji: '🚧',
    trailer: 'Changelog: build',
  },
  {
    value: 'ci',
    label: 'ci',
    hint: 'Changes to our CI configuration files and scripts',
    emoji: '🤖',
    trailer: 'Changelog: ci',
  },
  {
    value: 'chore',
    label: 'chore',
    hint: 'Other changes that do not modify src or test files',
    emoji: '🧹',
    trailer: 'Changelog: chore',
  },
  {
    value: '',
    label: 'none',
  },
]
export const commitOptions = {
  check_status: true,
  commit_type: {
    enable: true,
    initial_value: 'feat',
    max_items: 20,
    infer_type_from_branch: true,
    append_emoji_to_label: false,
    append_emoji_to_commit: false,
    emoji_commit_position: 'Start',
    options: commitTypeOptions,
  },
  commit_scope: {
    enable: true,
    custom_scope: false,
    max_items: 20,
    initial_value: 'app',
    options: commitScopeOptions,
  },
  check_ticket: {
    infer_ticket: true,
    confirm_ticket: true,
    add_to_title: true,
    append_hashtag: false,
    prepend_hashtag: 'Never',
    surround: '',
    title_position: 'start',
  },
  commit_title: {
    max_size: 70,
  },
  commit_body: {
    enable: true,
    required: false,
  },
  commit_footer: {
    enable: true,
    initial_value: [],
    options: ['closes', 'trailer', 'breaking-change', 'deprecated', 'custom'],
  },
  breaking_change: {
    add_exclamation_to_title: false,
  },
  cache_last_value: true,
  confirm_with_editor: false,
  confirm_commit: true,
  print_commit_output: true,
  branch_pre_commands: [],
  branch_post_commands: [],
  worktree_pre_commands: [],
  worktree_post_commands: [],
  branch_user: {
    enable: true,
    required: false,
    separator: '/',
  },
  branch_type: {
    enable: true,
    separator: '/',
  },
  branch_version: {
    enable: false,
    required: false,
    separator: '/',
  },
  branch_ticket: {
    enable: true,
    required: false,
    separator: '-',
  },
  branch_description: {
    max_length: 70,
    separator: '',
  },
  branch_action_default: 'branch',
  branch_order: ['user', 'version', 'type', 'ticket', 'description'],
  enable_worktrees: true,
  overrides: {},
}

export const commitlintConfig = {
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
    'scope-enum': [1, 'always', ['app', 'shared', 'server', 'tools', '']],
  },
}

export type CommitlintConfigType = typeof commitlintConfig
export const mergeCommitTypeEnumOptions = (options: string[]) => {
  // 与 commitTypeOptions 进行对比，如果 options 中存在，则返回 options 中的 value 和 label
  return options.map((option) => {
    const commitTypeOption = commitTypeOptions.find((commitTypeOption) => commitTypeOption.value === option)
    return {
      value: commitTypeOption?.value ?? option,
      label: commitTypeOption?.label ?? option,
      hint: commitTypeOption?.hint,
      emoji: commitTypeOption?.emoji,
      trailer: commitTypeOption?.trailer,
    }
  })
}

export const mergeCommitScopeEnumOptions = (options: string[]) => {
  // 与 commitScopeOptions 进行对比，如果 options 中存在，则返回 options 中的 value 和 label
  const result = options.includes('none') ? options : options.concat('none')
  return result.map((option) => {
    const commitScopeOption = commitScopeOptions.find((commitScopeOption) => commitScopeOption.value === option)
    return {
      value: commitScopeOption?.value ?? option,
      label: commitScopeOption?.label ?? option,
    }
  })
}
