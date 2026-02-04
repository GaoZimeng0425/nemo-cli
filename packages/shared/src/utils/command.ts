import process from 'node:process'
import { Command } from 'commander'
import { merge } from 'es-toolkit'
import { type Options, type Output, type Result, x as tinyexec } from 'tinyexec'
import { $, type ProcessPromise, type Options as ZXOptions } from 'zx'

import { handleError } from './error'
import { log } from './log'
import { isEmpty, isError } from './types'
// import { isEmpty, isString } from './types'

export const exit = (code: number) => process.exit(code)

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
// export interface DynamicCommandOptions extends Partial<ZxOptions> {
//   // 环境变量
//   env?: Record<string, string>
//   // 工作目录
//   cwd?: string
//   // 是否静默输出
//   quiet?: boolean
//   // 超时时间（毫秒）
//   timeout?: number
//   // 命令前缀
//   prefix?: string
// }

// 动态命令构建函数
export const buildCommand = (command: string, dynamicParts: (string | number | boolean | null | undefined)[] = []) => {
  const validParts = dynamicParts.filter((part) => !isEmpty(part)).map((part) => part?.toString())

  return {
    command,
    parts: validParts,
  }
}

// 增强的动态命令执行函数
export const x = (command: string, args?: string[], options: Partial<Options> = {}) => {
  const m = merge(
    {
      nodeOptions: {
        cwd: process.cwd(),
        FORCE_COLOR: '1',
      },
      throwOnError: true,
    },
    options
  )
  return tinyexec(command, args, m)
}

// 新增：动态命令执行器
export { $ }
export const zx = (
  baseCommand: string,
  dynamicParts: (string | number | boolean | null | undefined)[] = [],
  options: Partial<ZXOptions> = {}
): ProcessPromise => {
  const { command, parts } = buildCommand(baseCommand, dynamicParts)
  const { signal } = new AbortController()

  try {
    const $$ = isEmpty(options) ? $ : $({ ...options, signal })

    return $$`${command} ${parts}`
  } catch (error: unknown) {
    handleError(error, `Failed to execute dynamic command: ${command}`)
    throw error
  }
}

// 模板字符串命令构建器
// export const template = (strings: TemplateStringsArray, ...values: any[]) => {
//   return strings.reduce((result, string, i) => {
//     const value = values[i] ? String(values[i]) : ''
//     return result + string + value
//   }, '')
// }

// 条件命令构建器
// export const conditionalX = async (
//   conditions: Array<{
//     condition: boolean | (() => boolean)
//     command: string
//     args?: string[]
//     options?: DynamicCommandOptions
//   }>
// ) => {
//   for (const { condition, command, args = [], options = {} } of conditions) {
//     const shouldExecute = typeof condition === 'function' ? condition() : condition

//     if (shouldExecute) {
//       return await dynamicX(command, args, options)
//     }
//   }

//   throw new Error('No conditions matched for conditional command execution')
// }

// 并行命令执行器
// export const parallelX = async (
//   commands: Array<{
//     command: string
//     args?: string[]
//     options?: DynamicCommandOptions
//   }>
// ) => {
//   const promises = commands.map(({ command, args = [], options = {} }) => dynamicX(command, args, options))

//   return await Promise.all(promises)
// }

export const xASync = async (
  command: string,
  args?: string[],
  options?: Partial<Options> & { quiet?: boolean }
): Promise<[Error, null] | [null, Output]> => {
  try {
    const result = await tinyexec(
      command,
      args,
      merge(
        {
          nodeOptions: {
            cwd: process.cwd(),
            FORCE_COLOR: '1',
          },
          throwOnError: true,
        },
        options ?? {}
      )
    )
    if (result.exitCode) {
      !options?.quiet &&
        log.show(`Failed to execute command ${command}. Command exited with code ${result.exitCode}.`, {
          type: 'error',
        })
      !options?.quiet && log.show(result.stderr, { type: 'error' })
      return [new Error(result.stderr), null]
    }

    return [null, result]
  } catch (error) {
    handleError(error, `Failed to execute command ${command}.`)
    return [isError(error) ? error : new Error(error as string), null]
  }
}

export type { Command, Result }
