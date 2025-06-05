import path from 'node:path'
import { checkFile, dirList, log } from '@nemo-cli/shared'
import { ERROR_MESSAGE } from './constants'

export const searchWorkspaceDir = (): string[] => {
  const cwd = process.cwd()
  const pnpmWorkspacePath = `${cwd}/pnpm-workspace.yaml`
  const hasWorkspaceConfig = checkFile(pnpmWorkspacePath)
  // TODO: support custom workspace
  // const pkg = readPackage({ url: cwd })
  // const { workspaces } = pkg
  // const dirnames: string[] = []
  // if (isArray(workspaces)) {
  // } else {
  // }
  if (!hasWorkspaceConfig) {
    log.error('install ', ERROR_MESSAGE.notRootWorkspace)
    process.exit(0)
  }
  const workspaces = ['packages'].map((dir) => `${cwd}/${dir}`)
  return workspaces.flatMap(
    (workspace) => dirList(workspace).map((pack) => `${workspace}/${pack}`) || []
  )
}

export const relate = (source: string) => path.relative(process.cwd(), source)
