import {
  type Command,
  createCheckbox,
  createOptions,
  fileList,
  getWorkspacePackages,
  isChinese,
  log,
  parseNames,
} from '@nemo-cli/shared'
import { Node, Project } from 'ts-morph'

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

// 递归遍历 AST 节点，提取中文变量名
function extractChineseIdentifiers(node: Node) {
  const identifiers: string[] = []

  if (Node.isVariableDeclaration(node)) {
    const name = node.getNameNode().getText()
    if (isChinese(name)) {
      identifiers.push(name)
    }
  }
  // 检测字符串字面量中的中文
  else if (Node.isStringLiteral(node)) {
    const literalValue = node.getLiteralText()
    if (isChinese(literalValue)) {
      identifiers.push(literalValue)
    }
  }
  // 处理对象字面量中的属性值（只检测值，不检测键）
  else if (Node.isObjectLiteralExpression(node)) {
    node.getProperties().forEach((property) => {
      // 检查是否是属性赋值 (PropertyAssignment)
      const initializer = property
      if (Node.isStringLiteral(initializer)) {
        // 如果属性值是字符串字面量且包含中文，则添加
        const value = initializer.getLiteralText()
        if (isChinese(value)) {
          identifiers.push(value)
        }
      }
      // 检查是否是简写属性 (ShorthandPropertyAssignment)
      else if (Node.isShorthandPropertyAssignment(property)) {
        // 简写属性的情况，如 { name } 相当于 { name: name }
        // 这种情况下我们不需要特殊处理，因为它会在其他地方被递归处理
      }
    })
  }
  // 处理函数参数
  else if (Node.isParameterDeclaration(node)) {
    const name = node.getName()
    if (isChinese(name)) {
      identifiers.push(name)
    }
  } else if (Node.isCallExpression(node)) {
    const expression = node.getExpression()
    if (Node.isIdentifier(expression) && expression.getText() === 't') {
      const args = node.getArguments()
      if (args.length > 0 && Node.isStringLiteral(args[0])) {
        identifiers.push(args[0].getLiteralText())
      }
    }
  }

  // Recurse through all child nodes.
  node.forEachChild((child) => {
    identifiers.push(...extractChineseIdentifiers(child))
  })

  return identifiers
}

// Add a file to the project, analyze it, and return found literals.
const astHandler = (path: string) => {
  const result: string[] = []
  const sourceTSXFiles = project.addSourceFilesAtPaths(`${path}/**/*.tsx`)
  for (const sourceFile of sourceTSXFiles) {
    result.push(...extractChineseIdentifiers(sourceFile))
  }
  project.removeSourceFile(sourceTSXFiles[0]!)
  const sourceTSFiles = project.addSourceFilesAtPaths(`${path}/**/*.ts`)
  for (const sourceFile of sourceTSFiles) {
    result.push(...extractChineseIdentifiers(sourceFile))
  }
  project.removeSourceFile(sourceTSFiles[0]!)
  return result
}

export const astFilesCommand = (program: Command) => {
  program
    .command('ast [...dirnames]')
    .description('ast file which you choose')
    .action(async (dirnames: string, _options) => {
      const files = await getWorkspacePackages()
      if (files.length === 0) {
        return log.show('file: 当前文件夹为空', { type: 'success' })
      }
      const cwd = process.cwd()
      const dirnamesTrim = dirnames?.trim()
      const filesList: string[] = []
      if (dirnamesTrim) {
        const dirList: string[] = parseNames(dirnames)
        filesList.push(...dirList)
      } else {
        const choices = await createCheckbox({
          message: 'Choose file you want to ast',
          options: files.map((item) => ({ label: item.name, value: item.path })),
        })
        filesList.push(...choices)

        if (!filesList.length) {
          return log.show('file No file selected')
        }
      }
      for (const file of filesList) {
        const filePath = file.startsWith('/') ? file : `${cwd}/${file}`
        try {
          const literals = astHandler(filePath)
          if (literals.length > 0) {
            log.show(literals.join('\n'), { type: 'success' })
          } else {
            log.show(`No t() literals found in ${file}`, { type: 'error' })
          }
        } catch (e: any) {
          log.show(`Failed to process ${file}: ${e.message}`, { type: 'error' })
        }
      }
    })
}
