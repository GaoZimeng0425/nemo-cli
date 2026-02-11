import { existsSync } from 'node:fs'
import { resolve as resolvePath } from 'node:path'

import { createSelect, getWorkspaceDirs } from '@nemo-cli/shared'

export interface ResolveWorkspaceProjectPathOptions {
  targetPath: string
  selectMessage: string
  isCandidate: (path: string) => boolean
}

export async function resolveWorkspaceProjectPath({
  targetPath,
  selectMessage,
  isCandidate,
}: ResolveWorkspaceProjectPathOptions): Promise<string> {
  const resolved = resolvePath(targetPath || '.')
  const srcParent = inferSrcParent(resolved)
  const directRoot = srcParent ?? resolved

  if (isCandidate(directRoot)) {
    return directRoot
  }

  const candidates = await findWorkspaceCandidates(directRoot, isCandidate)
  if (candidates.length === 0) {
    return directRoot
  }
  if (candidates.length === 1) {
    return candidates[0] || directRoot
  }

  const selected = await createSelect({
    message: selectMessage,
    options: candidates.map((candidate) => ({
      label: toDisplayPath(directRoot, candidate),
      value: candidate,
    })),
  })

  return selected
}

export function inferSrcParent(targetPath: string): string | undefined {
  const normalized = targetPath.replace(/\\/g, '/')
  if (!normalized.endsWith('/src')) {
    return undefined
  }

  const parent = resolvePath(targetPath, '..')
  if (!existsSync(resolvePath(parent, 'package.json'))) {
    return undefined
  }

  return parent
}

async function findWorkspaceCandidates(basePath: string, isCandidate: (path: string) => boolean): Promise<string[]> {
  const cwd = process.cwd()
  try {
    process.chdir(basePath)
    const workspace = await getWorkspaceDirs()
    const all = workspace.packages.filter((pkgPath) => isCandidate(pkgPath))

    const appRouterFirst = all.filter(
      (pkgPath) => existsSync(resolvePath(pkgPath, 'app')) || existsSync(resolvePath(pkgPath, 'src', 'app'))
    )
    if (appRouterFirst.length > 0) {
      return appRouterFirst.sort()
    }

    return all.sort()
  } catch {
    return []
  } finally {
    process.chdir(cwd)
  }
}

function toDisplayPath(basePath: string, target: string): string {
  if (target.startsWith(`${basePath}/`)) {
    return target.slice(basePath.length + 1)
  }
  return target
}
