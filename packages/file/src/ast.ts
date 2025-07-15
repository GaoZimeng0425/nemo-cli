import { type Command, createCheckbox, fileList, log, parseNames } from '@nemo-cli/shared'
import { Node, Project } from 'ts-morph'

// import { JsxEmit } from 'typescript'

// Initialize project with settings to handle React/JSX files.
const project = new Project({
  compilerOptions: {
    jsx: 4,
    esModuleInterop: true,
  },
  // We don't need to load the entire project from tsconfig.json to analyze a single file.
  skipAddingFilesFromTsConfig: true,
})

const CHINESE_STRING_REGEXP = /[\u4e00-\u9fa5]/
// 检测字符串是否为中文（Unicode 范围）
const isChinese = (text: string): boolean => CHINESE_STRING_REGEXP.test(text) // 匹配中文字符

// 递归遍历 AST 节点，提取中文变量名
function extractChineseIdentifiers(node: Node) {
  const identifiers: string[] = []

  if (Node.isVariableDeclaration(node)) {
    const name = node.getNameNode().getText()
    log.show(`isVariableDeclaration: ${name}`, { type: 'success' })
    if (isChinese(name)) {
      identifiers.push(name)
    }
  }
  // 处理对象字面量中的属性名（嵌套对象）
  else if (Node.isObjectLiteralExpression(node)) {
    node.getChildren().forEach((child) => {
      log.show(`🚀 : node.getChildren : child: ${child.formatText()}`)
    })
    node.getProperties().forEach((property) => {
      const literalValue = property.getKindName()
      console.log('🚀 : node.getProperties : literalValue:', literalValue)
      const parent = node.getParent()
      if (isChinese(literalValue) && parent && !Node.isImportDeclaration(parent) && !Node.isExportDeclaration(parent)) {
        identifiers.push(literalValue)
      }

      const name = property.getText()
      if (isChinese(name)) {
        identifiers.push(name)
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
  // sourceFile.forEach((item) => {
  //   log.show(`${item.getFilePath()} getFilePath`, { type: 'error' })
  // })

  const result: string[] = []
  const sourceFiles = project.addSourceFilesAtPaths(`${path}/file/src/**/*.tsx`)
  for (const sourceFile of sourceFiles) {
    result.push(...extractChineseIdentifiers(sourceFile))
  }
  project.removeSourceFile(sourceFiles[0]!)
  return result
}

export const astFilesCommand = (program: Command) => {
  program
    .command('ast [...dirnames]')
    .description('ast file which you choose')
    .action(async (dirnames: string, _options) => {
      const files = fileList()
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
        const choices: string[] = await createCheckbox({
          message: 'Choose file you want to Delete',
          options: files.map((file) => ({
            value: file,
            label: file,
          })),
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
