/**
 * File opener utilities
 */

import type { EditorType } from '../types'

/**
 * Detect available editor
 */
export function detectEditor(): EditorType {
  // Simple detection based on user agent or environment
  // In a real implementation, you might check for installed apps
  return 'auto'
}

/**
 * Open file in VS Code
 */
export function openInVSCode(filePath: string): boolean {
  try {
    const absolutePath = filePath.startsWith('/') ? filePath : `/${filePath}`
    const protocol = `vscode://file${absolutePath}`
    window.open(protocol, '_blank')
    return true
  } catch (error) {
    console.error('Failed to open in VS Code:', error)
    return false
  }
}

/**
 * Open file in WebStorm
 */
export function openInWebStorm(filePath: string): boolean {
  try {
    const protocol = `webstorm://open?file=${encodeURIComponent(filePath)}`
    window.open(protocol, '_blank')
    return true
  } catch (error) {
    console.error('Failed to open in WebStorm:', error)
    return false
  }
}

/**
 * Copy file path to clipboard as fallback
 */
export async function copyPathToClipboard(filePath: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(filePath)
    return true
  } catch (error) {
    console.error('Failed to copy to clipboard:', error)
    return false
  }
}

/**
 * Open file in detected editor
 */
export async function openFileInEditor(
  filePath: string,
  editorType: EditorType = 'auto'
): Promise<{ success: boolean; method: string; error?: string }> {
  const editor = editorType === 'auto' ? detectEditor() : editorType

  // Try VS Code first (most common)
  if (editor === 'auto' || editor === 'vscode') {
    const success = openInVSCode(filePath)
    if (success) {
      return { success: true, method: 'vscode' }
    }
  }

  // Try WebStorm
  if (editor === 'auto' || editor === 'webstorm') {
    const success = openInWebStorm(filePath)
    if (success) {
      return { success: true, method: 'webstorm' }
    }
  }

  // Fallback: copy to clipboard
  const copied = await copyPathToClipboard(filePath)
  if (copied) {
    return {
      success: true,
      method: 'clipboard',
      error: '无法打开编辑器,文件路径已复制到剪贴板',
    }
  }

  return {
    success: false,
    method: 'none',
    error: '无法打开编辑器或复制文件路径',
  }
}

/**
 * Validate file path is within allowed range
 */
export function validateFilePath(filePath: string, _appRoot: string): boolean {
  // Basic validation - ensure path is not trying to escape
  // In a real app, you'd do more thorough validation
  if (filePath.includes('..')) {
    return false
  }

  return true
}
