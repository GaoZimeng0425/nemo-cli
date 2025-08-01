import { isChinese } from '@nemo-cli/shared'
import {
  type CallExpression,
  Node,
  type ObjectLiteralExpression,
  Project,
  type StringLiteral,
  type VariableDeclaration,
} from 'ts-morph'

enum JsxEmit {
  None = 0,
  Preserve = 1,
  React = 2,
  ReactNative = 3,
  ReactJSX = 4,
  ReactJSXDev = 5,
}

const project = new Project({
  compilerOptions: {
    jsx: JsxEmit.ReactJSX,
    esModuleInterop: true,
  },
  skipAddingFilesFromTsConfig: true,
})

const variableHandle = (node: VariableDeclaration) => {
  const identifiers: string[] = []
  const valueNode = node.getInitializer()
  if (Node.isStringLiteral(valueNode)) {
    const value = valueNode.getLiteralText()
    identifiers.push(value)
  }
  return identifiers
}
const handleStringLiteral = (node: StringLiteral) => {
  const identifiers: string[] = []
  const literalValue = node.getLiteralText()
  identifiers.push(literalValue)
  return identifiers
}
const handleObjectLiteralExpression = (node: ObjectLiteralExpression) => {
  const identifiers: string[] = []
  node.getProperties().forEach((property) => {
    if (Node.isPropertyAssignment(property)) {
      const initializer = property.getInitializer()
      if (Node.isStringLiteral(initializer)) {
        const value = initializer.getLiteralText()
        identifiers.push(value)
      }
    }
    // 检查是否是简写属性 (ShorthandPropertyAssignment)
    else if (Node.isShorthandPropertyAssignment(property)) {
      // 简写属性的情况，如 { name } 相当于 { name: name }
      // 这种情况下我们不需要特殊处理，因为它会在其他地方被递归处理
    }
  })
  return identifiers
}
const execCallExpression = (node: CallExpression) => {
  const identifiers: string[] = []
  const expression = node.getExpression()
  if (Node.isIdentifier(expression)) {
    const args = node.getArguments()
    for (const arg of args) {
      if (Node.isStringLiteral(arg)) {
        identifiers.push(arg.getLiteralText())
      }
    }
  }
  return identifiers
}
const handleCallExpression = (node: CallExpression) => {
  const identifiers: string[] = []
  const expression = node.getExpression()

  // 检查是否是 console.log 调用，如果是则跳过处理
  if (Node.isPropertyAccessExpression(expression)) {
    const ignoreList = ['console', 'log']
    const objName = expression.getExpression().getText()
    // const methodName = expression.getName()
    if (ignoreList.includes(objName)) {
      return identifiers
    }
    node.getArguments().forEach((arg) => {
      if (Node.isStringLiteral(arg)) {
        identifiers.push(arg.getLiteralText())
      }
    })
  } else {
    identifiers.push(...execCallExpression(node))
  }

  return identifiers
}
// 递归遍历 AST 节点，提取中文变量名
function extractChineseIdentifiers(node: Node) {
  const identifiers: string[] = []

  // 检测变量声明
  if (Node.isVariableDeclaration(node)) {
    identifiers.push(...variableHandle(node))
  }
  // 检测字符串字面量中的中文
  else if (Node.isStringLiteral(node)) {
    // identifiers.push(...handleStringLiteral(node))
  }
  // 处理对象字面量中的属性值（只检测值，不检测键）
  else if (Node.isObjectLiteralExpression(node)) {
    identifiers.push(...handleObjectLiteralExpression(node))
  }
  // 处理函数
  else if (Node.isCallExpression(node)) {
    identifiers.push(...handleCallExpression(node))
  }

  node.forEachChild((child) => {
    identifiers.push(...extractChineseIdentifiers(child))
  })

  const result = identifiers.filter((item) => isChinese(item))

  return result
}

type IdentifiersType = {
  filePath: string
  identifiers: string[]
}

const defaultExcludeDirs = ['node_modules', 'dist', 'build', '.git']
// 高级排除目录处理函数
type ASTHandlerOptions = {
  excludeDirs?: string[]
  excludePatterns?: string[]
  includePatterns?: string[]
  extensions?: string[]
}
export const astHandler = async (path: string, options: ASTHandlerOptions = {}) => {
  const {
    excludeDirs: userExcludeDirs = [],
    excludePatterns: userExcludePatterns = [],
    includePatterns: userIncludePatterns = [],
    extensions = ['ts', 'tsx', 'json'],
  } = options

  const current: IdentifiersType[] = []

  const excludeDirs = [...defaultExcludeDirs, ...userExcludeDirs]

  for (const extension of extensions) {
    // 构建包含模式
    const baseIncludePattern = `${path}/**/*.${extension}`
    const allIncludePatterns = [baseIncludePattern, ...userIncludePatterns]

    // 构建排除模式
    const allExcludePatterns = [
      ...excludeDirs.map((dir: string) => `!${path}/${dir}/**/*`),
      ...userExcludePatterns.map((pattern: string) => `!${pattern}`),
    ]

    // 组合所有模式
    const patterns = [...allIncludePatterns, ...allExcludePatterns]

    try {
      const sourceFiles = project.addSourceFilesAtPaths(patterns)
      for (const sourceFile of sourceFiles) {
        const identifiers = extractChineseIdentifiers(sourceFile)
        current.push({ filePath: sourceFile.getFilePath(), identifiers })
        project.removeSourceFile(sourceFile)
      }
    } catch (error) {
      console.warn(`Warning: Failed to process ${extension} files:`, error)
    }
  }

  return current
}
