/** biome-ignore-all lint/suspicious/noExplicitAny: need any */
import { readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import {
  type Command,
  createCheckbox,
  createConfirm,
  createInput,
  createSelect,
  createSpinner,
  log,
} from '@nemo-cli/shared'
import { Message } from '@nemo-cli/ui'

interface GitConfig {
  user?: {
    name?: string
    email?: string
  }
  init?: {
    defaultBranch?: string
  }
  pull?: {
    rebase?: boolean | string
  }
  push?: {
    default?: string
    autoSetupRemote?: boolean
  }
  rebase?: {
    autoStash?: boolean
  }
  color?: {
    ui?: boolean | string
  }
  alias?: Record<string, string>
  [key: string]: any
}

const GITCONFIG_PATH = join(homedir(), '.gitconfig')

// 读取 gitconfig 文件
const readGitConfig = (): GitConfig => {
  try {
    const content = readFileSync(GITCONFIG_PATH, 'utf-8')
    const config: GitConfig = {}
    let currentSection: string | null = null
    let subsection: string | null = null

    for (const line of content.split('\n')) {
      const trimmed = line.trim()

      // 跳过注释和空行
      if (!trimmed || trimmed.startsWith('#')) continue

      // 匹配节 [section]
      const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/)
      if (sectionMatch) {
        currentSection = sectionMatch[1] || null
        subsection = null
        if (currentSection && !config[currentSection]) {
          config[currentSection] = {}
        }
        continue
      }

      // 匹配子节 [section "subsection"]
      const subsectionMatch = trimmed.match(/^\[([^\s]+) "([^"]+)"\]$/)
      if (subsectionMatch) {
        currentSection = subsectionMatch[1] || null
        subsection = subsectionMatch[2] || null
        if (currentSection && !config[currentSection]) {
          config[currentSection] = {}
        }
        if (subsection && currentSection && typeof config[currentSection] === 'object') {
          if (!config[currentSection][subsection]) {
            ;(config[currentSection] as Record<string, any>)[subsection] = {}
          }
        }
        continue
      }

      // 匹配键值对 key = value
      const keyValueMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/)
      if (keyValueMatch && currentSection) {
        const key = keyValueMatch[1]
        const value = keyValueMatch[2]
        let target = config[currentSection]

        // 如果有子节，设置到子节中
        if (subsection && typeof target === 'object') {
          if (!target[subsection]) {
            ;(target as Record<string, any>)[subsection] = {}
          }
          target = (target as Record<string, any>)[subsection]
        }

        // 处理布尔值
        if (key && value === 'true') {
          target[key] = true
        } else if (key && value === 'false') {
          target[key] = false
        } else if (key) {
          target[key] = value
        }
      }
    }

    return config
  } catch {
    // 文件不存在或读取失败
    return {}
  }
}

// 写入 gitconfig 文件
const writeGitConfig = (config: GitConfig) => {
  const lines: string[] = []

  const sections = Object.keys(config).sort()

  for (const section of sections) {
    const value = config[section]

    // 跳过空对象
    if (!value || typeof value !== 'object') continue
    if (Object.keys(value).length === 0) continue

    // 处理普通节 [section]
    let isSubsection = false
    for (const key of Object.keys(value)) {
      if (typeof value[key] === 'object' && key !== 'alias') {
        // 这是子节
        isSubsection = true
        break
      }
    }

    if (isSubsection) {
      // 处理带子节的配置
      for (const [subsection, subValue] of Object.entries(value)) {
        if (typeof subValue !== 'object' || subValue === null) continue

        lines.push(`[${section} "${subsection}"]`)
        for (const [key, val] of Object.entries(subValue)) {
          lines.push(`\t${key} = ${val}`)
        }
        lines.push('') // 空行分隔
      }
    } else {
      // 普通节
      lines.push(`[${section}]`)
      for (const [key, val] of Object.entries(value)) {
        if (typeof val === 'object' && val !== null) {
          // 处理 alias 等嵌套对象
          for (const [subKey, subVal] of Object.entries(val)) {
            lines.push(`\t${subKey} = ${subVal}`)
          }
        } else {
          lines.push(`\t${key} = ${val}`)
        }
      }
      lines.push('') // 空行分隔
    }
  }

  writeFileSync(GITCONFIG_PATH, lines.join('\n'), 'utf-8')
}

// 格式化显示配置
const displayConfig = (config: GitConfig) => {
  const lines: string[] = []

  if (config.user) {
    lines.push('👤 User Information:')
    if (config.user.name) lines.push(`  Name: ${config.user.name}`)
    if (config.user.email) lines.push(`  Email: ${config.user.email}`)
    lines.push('')
  }

  if (config.init?.defaultBranch) {
    lines.push('🌳 Initial Branch:')
    lines.push(`  Default: ${config.init.defaultBranch}`)
    lines.push('')
  }

  if (config.pull) {
    lines.push('📥 Pull Strategy:')
    if (config.pull.rebase !== undefined) {
      lines.push(`  Rebase: ${config.pull.rebase}`)
    }
    lines.push('')
  }

  if (config.push) {
    lines.push('📤 Push Strategy:')
    if (config.push.default) lines.push(`  Default: ${config.push.default}`)
    if (config.push.autoSetupRemote !== undefined) {
      lines.push(`  Auto Setup Remote: ${config.push.autoSetupRemote}`)
    }
    lines.push('')
  }

  if (config.color) {
    lines.push('🎨 Color:')
    if (config.color.ui !== undefined) {
      lines.push(`  UI: ${config.color.ui}`)
    }
    lines.push('')
  }

  if (config.alias && Object.keys(config.alias).length > 0) {
    lines.push('⚡ Aliases:')
    for (const [alias, command] of Object.entries(config.alias)) {
      lines.push(`  ${alias} = ${String(command)}`)
    }
    lines.push('')
  }

  return lines.join('\n')
}

// 配置用户信息
const configureUserInfo = async (config: GitConfig) => {
  const action = await createSelect({
    message: 'What would you like to configure?',
    options: [
      { label: 'Name', value: 'name' },
      { label: 'Email', value: 'email' },
      { label: 'Both', value: 'both' },
    ],
  })

  if (action === 'name' || action === 'both') {
    const name = await createInput({
      message: 'Enter your name:',
      initialValue: config.user?.name || '',
      placeholder: config.user?.name || 'Your name',
    })
    if (!config.user) config.user = {}
    config.user.name = name || config.user.name
  }

  if (action === 'email' || action === 'both') {
    const email = await createInput({
      message: 'Enter your email:',
      initialValue: config.user?.email || '',
      placeholder: config.user?.email || 'your@email.com',
    })
    if (!config.user) config.user = {}
    config.user.email = email || config.user.email
  }

  return config
}

// 配置常用选项
const configureCommonOptions = async (config: GitConfig) => {
  const options = await createCheckbox({
    message: 'Select options to configure:',
    options: [
      { label: 'Default branch name', value: 'defaultBranch' },
      { label: 'Pull rebase strategy', value: 'pullRebase' },
      { label: 'Push default strategy', value: 'pushDefault' },
      { label: 'Enable color output', value: 'colorUi' },
      { label: 'Auto stash on rebase', value: 'autoStash' },
    ],
    required: false,
  })

  for (const option of options) {
    switch (option) {
      case 'defaultBranch': {
        const branch = await createInput({
          message: 'Enter default branch name:',
          initialValue: config.init?.defaultBranch || 'main',
          placeholder: 'main',
        })
        if (!config.init) config.init = {}
        config.init.defaultBranch = branch || config.init.defaultBranch || 'main'
        break
      }
      case 'pullRebase': {
        const rebase = await createSelect({
          message: 'Select pull rebase strategy:',
          options: [
            { label: 'False (merge)', value: 'false' },
            { label: 'True (rebase)', value: 'true' },
            { label: 'Interactive', value: 'interactive' },
          ],
        })
        if (!config.pull) config.pull = {}
        config.pull.rebase = rebase === 'false' ? false : rebase
        break
      }
      case 'pushDefault': {
        const pushDefault = await createSelect({
          message: 'Select push default strategy:',
          options: [
            { label: 'current', value: 'current' },
            { label: 'upstream', value: 'upstream' },
            { label: 'simple', value: 'simple' },
            { label: 'matching', value: 'matching' },
          ],
        })
        if (!config.push) config.push = {}
        config.push.default = pushDefault
        break
      }
      case 'colorUi': {
        const color = await createSelect({
          message: 'Select color output:',
          options: [
            { label: 'Auto', value: 'auto' },
            { label: 'Always', value: 'always' },
            { label: 'Never', value: 'false' },
          ],
        })
        if (!config.color) config.color = {}
        config.color.ui = color === 'false' ? false : color
        break
      }
      case 'autoStash': {
        const autoStash = (await createConfirm({
          message: 'Enable auto stash on rebase?',
          initialValue: config.rebase?.autoStash === true,
        })) as boolean
        if (!config.rebase) config.rebase = {}
        config.rebase.autoStash = autoStash
        break
      }
    }
  }

  return config
}

// 配置别名
const configureAliases = async (config: GitConfig) => {
  const action = await createSelect({
    message: 'What would you like to do?',
    options: [
      { label: 'Add new alias', value: 'add' },
      { label: 'Remove alias', value: 'remove' },
      { label: 'List all aliases', value: 'list' },
    ],
  })

  if (action === 'add') {
    const alias = await createInput({
      message: 'Enter alias name:',
      initialValue: '',
      placeholder: 'st',
    })

    const command = await createInput({
      message: 'Enter git command:',
      initialValue: '',
      placeholder: 'status',
    })

    // 验证输入不为空
    if (!alias || !command) {
      Message({ text: 'Alias name and command cannot be empty.' })
      return config
    }

    if (!config.alias) config.alias = {}
    config.alias[alias] = command

    Message({ text: `Added alias: ${alias} = ${command}` })
  } else if (action === 'remove') {
    if (!config.alias || Object.keys(config.alias).length === 0) {
      Message({ text: 'No aliases to remove.' })
      return config
    }

    const aliases = Object.keys(config.alias).map((key) => ({
      label: `${key} = ${config.alias![key]}`,
      value: key,
    }))

    const toRemove = await createSelect({
      message: 'Select alias to remove:',
      options: aliases,
    })

    delete config.alias[toRemove]
    Message({ text: `Removed alias: ${toRemove}` })
  } else if (action === 'list') {
    if (!config.alias || Object.keys(config.alias).length === 0) {
      Message({ text: 'No aliases configured.' })
    } else {
      const aliasList = Object.entries(config.alias)
        .map(([alias, command]) => `${alias} = ${command}`)
        .join('\n')
      log.show(aliasList, { type: 'info' })
    }
  }

  return config
}

// 快速初始化配置
const initializeConfig = async (config: GitConfig) => {
  Message({ text: "🚀 Let's set up your git configuration!" })

  // 1. 用户名
  const name = await createInput({
    message: 'What is your name?',
    initialValue: config.user?.name || '',
    placeholder: 'GaoZimeng',
  })
  if (name) {
    if (!config.user) config.user = {}
    config.user.name = name
  }

  // 2. 邮箱
  const email = await createInput({
    message: 'What is your email?',
    initialValue: config.user?.email || '',
    placeholder: 'your@email.com',
  })
  if (email) {
    if (!config.user) config.user = {}
    config.user.email = email
  }

  // 3. 默认分支
  const defaultBranch = await createInput({
    message: 'What should be the default branch name?',
    initialValue: config.init?.defaultBranch || 'main',
    placeholder: 'main',
  })
  if (defaultBranch) {
    if (!config.init) config.init = {}
    config.init.defaultBranch = defaultBranch
  }

  // 4. 是否启用颜色
  const enableColor = (await createConfirm({
    message: 'Enable colored output?',
    initialValue: config.color?.ui !== false,
  })) as boolean
  if (!config.color) config.color = {}
  config.color.ui = enableColor ? 'auto' : false

  // 5. 自动设置远程分支
  const autoSetupRemote = (await createConfirm({
    message: 'Automatically setup remote branch when pushing?',
    initialValue: config.push?.autoSetupRemote !== false,
  })) as boolean
  if (!config.push) config.push = {}
  config.push.autoSetupRemote = autoSetupRemote

  // 6. rebase 时自动 stash
  const autoStash = (await createConfirm({
    message: 'Auto stash before rebase?',
    initialValue: config.rebase?.autoStash !== false,
  })) as boolean
  if (!config.rebase) config.rebase = {}
  config.rebase.autoStash = autoStash

  return config
}

export const configCommand = (command: Command) => {
  const subCommand = command.command('config').description('Interactive git configuration manager')

  subCommand
    .command('init')
    .description('Quick setup basic git configuration')
    .action(async () => {
      const config = readGitConfig()
      const updatedConfig = await initializeConfig(config)

      const spinner = createSpinner('Saving configuration...')
      writeGitConfig(updatedConfig)
      spinner.stop('✓ Git configuration initialized successfully!')

      // 显示配置结果
      const display = displayConfig(updatedConfig)
      if (display) {
        log.show(`\n${display}`)
      }
    })

  subCommand.action(async () => {
    let continueRunning = true

    while (continueRunning) {
      // 主菜单
      const action = await createSelect({
        message: 'What would you like to do?',
        options: [
          { label: '📖 View current config', value: 'view' },
          { label: '👤 Configure user info', value: 'user' },
          { label: '⚙️  Configure options', value: 'options' },
          { label: '⚡ Manage aliases', value: 'aliases' },
          { label: '🧹 Clear all config', value: 'clear' },
          { label: '❌ Exit', value: 'exit' },
        ],
      })

      if (action === 'exit') {
        continueRunning = false
        continue
      }

      if (action === 'view') {
        const config = readGitConfig()
        const display = displayConfig(config)

        if (display) {
          log.show(`\n${display}`)
        } else {
          Message({ text: 'No configuration found.' })
        }
      } else if (action === 'user') {
        const config = readGitConfig()
        const updatedConfig = await configureUserInfo(config)

        const spinner = createSpinner('Saving configuration...')
        writeGitConfig(updatedConfig)
        spinner.stop('✓ Configuration saved successfully!')
      } else if (action === 'options') {
        const config = readGitConfig()
        const updatedConfig = await configureCommonOptions(config)

        const spinner = createSpinner('Saving configuration...')
        writeGitConfig(updatedConfig)
        spinner.stop('✓ Configuration saved successfully!')
      } else if (action === 'aliases') {
        const config = readGitConfig()
        const updatedConfig = await configureAliases(config)

        const spinner = createSpinner('Saving configuration...')
        writeGitConfig(updatedConfig)
        spinner.stop('✓ Configuration saved successfully!')
      } else if (action === 'clear') {
        const confirm = await createConfirm({
          message: 'Are you sure you want to clear all git configuration?',
        })

        if (confirm) {
          const spinner = createSpinner('Clearing configuration...')
          writeGitConfig({})
          spinner.stop('✓ Configuration cleared successfully!')
        }
      }
    }
  })

  return command
}
