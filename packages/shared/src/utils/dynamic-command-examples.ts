// import { buildCommand, conditionalX, dynamicX, parallelX, serialX, template } from './command'

// // 动态命令使用示例

// /**
//  * 基础动态命令示例
//  * 根据条件动态构建 git 命令
//  */
// export async function dynamicGitExample() {
//   const branch = 'feature/new-feature'
//   const remote = 'origin'
//   const force = true

//   // 动态构建 git push 命令
//   await dynamicX('git push', [
//     remote,
//     branch,
//     force ? '--force' : null, // null 值会被自动过滤
//   ])

//   // 等价于：git push origin feature/new-feature --force
// }

// /**
//  * 条件命令示例
//  * 根据不同条件执行不同的包管理器命令
//  */
// export async function conditionalPackageManagerExample() {
//   const hasYarnLock = true // 实际中可以检查文件是否存在
//   const hasPnpmLock = false

//   await conditionalX([
//     {
//       condition: hasPnpmLock,
//       command: 'pnpm',
//       args: ['install'],
//     },
//     {
//       condition: hasYarnLock,
//       command: 'yarn',
//       args: ['install'],
//     },
//     {
//       condition: true, // 默认条件
//       command: 'npm',
//       args: ['install'],
//     },
//   ])
// }

// /**
//  * 并行命令示例
//  * 同时运行多个测试命令
//  */
// export async function parallelTestExample() {
//   const results = await parallelX([
//     {
//       command: 'npm run test:unit',
//     },
//     {
//       command: 'npm run test:e2e',
//     },
//     {
//       command: 'npm run lint',
//     },
//   ])

//   console.log('所有测试完成:', results.length)
// }

// /**
//  * 串行命令示例
//  * 按顺序执行构建流程
//  */
// export async function serialBuildExample() {
//   await serialX([
//     {
//       command: 'npm run clean',
//     },
//     {
//       command: 'npm run build',
//     },
//     {
//       command: 'npm run test',
//       continueOnError: true, // 测试失败也继续执行
//     },
//     {
//       command: 'npm run deploy',
//     },
//   ])
// }

// /**
//  * 复杂动态命令示例
//  * 根据环境和参数动态构建 Docker 命令
//  */
// export async function dynamicDockerExample() {
//   const environment = 'production'
//   const image = 'my-app'
//   const version = '1.0.0'
//   const port = 3000
//   const volumes = ['/app/data:/data', '/app/logs:/logs']
//   const envVars = ['NODE_ENV=production', 'PORT=3000']

//   // 构建复杂的 docker run 命令
//   const dockerArgs = [
//     'run',
//     '-d', // 后台运行
//     '--name',
//     `${image}-${environment}`,
//     '--restart',
//     'unless-stopped',
//     '-p',
//     `${port}:${port}`,
//     ...volumes.flatMap((volume) => ['-v', volume]),
//     ...envVars.flatMap((env) => ['-e', env]),
//     `${image}:${version}`,
//   ]

//   await dynamicX('docker', dockerArgs, {
//     env: { DOCKER_BUILDKIT: '1' },
//     quiet: false,
//   })
// }

// /**
//  * 模板字符串命令示例
//  */
// export async function templateCommandExample() {
//   const user = 'admin'
//   const database = 'myapp_db'
//   const host = 'localhost'

//   const command = template`mysql -u ${user} -h ${host} -e "CREATE DATABASE IF NOT EXISTS ${database}"`

//   await dynamicX(command)
// }

// /**
//  * 函数式命令构建示例
//  */
// export async function functionalCommandExample() {
//   const isProduction = process.env.NODE_ENV === 'production'

//   // 使用函数动态决定命令
//   const buildCommand = () => {
//     return isProduction ? 'npm run build:prod' : 'npm run build:dev'
//   }

//   const getArgs = (cmd: string) => {
//     return cmd.includes('prod') ? ['--optimize'] : ['--watch']
//   }

//   // 这里使用原来的 x 函数，它现在支持函数式参数
//   // await x(buildCommand, getArgs)
// }

// /**
//  * 环境相关的动态命令示例
//  */
// export async function environmentAwareExample() {
//   const nodeEnv = process.env.NODE_ENV || 'development'
//   const isCI = process.env.CI === 'true'

//   // 根据环境动态调整命令选项
//   const options = {
//     env: {
//       NODE_ENV: nodeEnv,
//       CI: isCI ? 'true' : 'false',
//     },
//     cwd: process.cwd(),
//     quiet: isCI, // CI 环境下静默运行
//     timeout: isCI ? 300000 : 60000, // CI 环境下更长的超时时间
//   }

//   await dynamicX('npm run test', ['--coverage'], options)
// }

// /**
//  * 命令构建器示例
//  */
// export function commandBuilderExample() {
//   const baseCommand = 'git'
//   const action = 'commit'
//   const message = 'feat: add new feature'
//   const files = ['src/index.ts', 'README.md']
//   const skipHooks = true

//   // 使用构建器模式
//   const { command } = buildCommand(baseCommand, [
//     action,
//     files.length > 0 ? files.join(' ') : null,
//     '-m',
//     `"${message}"`,
//     skipHooks ? '--no-verify' : null,
//   ])

//   console.log('构建的命令:', command)
//   // 输出: git commit src/index.ts README.md -m "feat: add new feature" --no-verify
// }

// /**
//  * 错误处理示例
//  */
// export async function errorHandlingExample() {
//   try {
//     await dynamicX('some-command-that-might-fail', ['--option'])
//   } catch (error: any) {
//     console.error('命令执行失败:', error.message)

//     // 可以根据错误类型进行不同处理
//     if (error.exitCode === 1) {
//       console.log('尝试使用备用命令...')
//       await dynamicX('alternative-command')
//     }
//   }
// }
