import { Command } from 'commander'
import { type Options, type Result, x as tinyexec } from 'tinyexec'
import { $, type Options as ZxOptions } from 'zx'

import { log } from './log'
import { isEmpty, isString } from './types'

export const createHelpExample = (...commands: string[]) => {
  const commandsString = commands.map((command) => `  $ ${command}`).join('\n')
  return `
Example:
${commandsString}
`
}

export const createCommand = (name: string): Command => {
  const command = new Command(name)
  command.allowExcessArguments()
  command.allowUnknownOption()

  return command
}

// 动态命令构建器
export interface DynamicCommandOptions extends Partial<ZxOptions> {
  // 环境变量
  env?: Record<string, string>
  // 工作目录
  cwd?: string
  // 是否静默输出
  quiet?: boolean
  // 超时时间（毫秒）
  timeout?: number
  // 命令前缀
  prefix?: string
}

// 动态命令构建函数
export const buildCommand = (command: string, dynamicParts: (string | number | boolean | null | undefined)[] = []) => {
  const validParts = dynamicParts
    .filter((part) => !isEmpty(isString(part) ? part.trim() : part))
    .map((part) => part?.toString())

  return {
    command,
    parts: validParts,
  }
}

// 增强的动态命令执行函数
export const x = (command: string, args?: string[], options?: Partial<Options>) => tinyexec(command, args, options)

// 新增：动态命令执行器
export const dynamicX = async (
  baseCommand: string,
  dynamicParts: (string | number | boolean | null | undefined)[] = [],
  options: DynamicCommandOptions = {}
) => {
  const { command, parts } = buildCommand(baseCommand, dynamicParts)

  try {
    const $$ = isEmpty(options) ? $ : $(options)

    return await $$`${command} ${parts}`
  } catch (error: any) {
    log.show(`Failed to execute dynamic command: ${command}`, { type: 'error' })
    log.show(error.stderr || error.message, { type: 'error' })
    throw error
  }
}

// 模板字符串命令构建器
export const template = (strings: TemplateStringsArray, ...values: any[]) => {
  return strings.reduce((result, string, i) => {
    const value = values[i] ? String(values[i]) : ''
    return result + string + value
  }, '')
}

// 条件命令构建器
export const conditionalX = async (
  conditions: Array<{
    condition: boolean | (() => boolean)
    command: string
    args?: string[]
    options?: DynamicCommandOptions
  }>
) => {
  for (const { condition, command, args = [], options = {} } of conditions) {
    const shouldExecute = typeof condition === 'function' ? condition() : condition

    if (shouldExecute) {
      return await dynamicX(command, args, options)
    }
  }

  throw new Error('No conditions matched for conditional command execution')
}

// 并行命令执行器
export const parallelX = async (
  commands: Array<{
    command: string
    args?: string[]
    options?: DynamicCommandOptions
  }>
) => {
  const promises = commands.map(({ command, args = [], options = {} }) => dynamicX(command, args, options))

  return await Promise.all(promises)
}

// 串行命令执行器
export const serialX = async (
  commands: Array<{
    command: string
    args?: string[]
    options?: DynamicCommandOptions
    continueOnError?: boolean
  }>
) => {
  const results = []

  for (const { command, args = [], options = {}, continueOnError = false } of commands) {
    try {
      const result = await dynamicX(command, args, options)
      results.push(result)
    } catch (error) {
      if (!continueOnError) {
        throw error
      }
      log.show(`Command failed but continuing: ${command}`, { type: 'warn' })
      results.push(null)
    }
  }

  return results
}

export const createX = async (command: string, args?: string[], options?: Partial<Options>) => {
  const result = await tinyexec(command, args, options)

  if (result.exitCode) {
    log.show(`Failed to execute command ${command}. Command exited with code ${result.exitCode}.`, { type: 'error' })
    log.show(result.stderr, { type: 'error' })
  }

  return result
}

export type { Command, Result }
