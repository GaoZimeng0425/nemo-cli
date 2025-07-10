import { type Command, createCheckbox, fileList, log, parseNames } from '@nemo-cli/shared'
import { Node, Project } from 'ts-morph'

// 初始化项目并加载文件
const project = new Project()

const CHINESE_STRING_REGEXP = /[\u4e00-\u9fa5]/
// 检测字符串是否为中文（Unicode 范围）
const isChinese = (text: string): boolean => CHINESE_STRING_REGEXP.test(text) // 匹配中文字符

// 递归遍历 AST 节点，提取中文变量名
function extractChineseIdentifiers(node: Node) {
  const identifiers: string[] = []

  // 处理变量声明（const/let）
  if (Node.isVariableDeclaration(node)) {
    const name = node.getNameNode().getText()
    if (isChinese(name)) {
      identifiers.push(name)
    }
  }
  // 处理对象字面量中的属性名（嵌套对象）
  else if (Node.isObjectLiteralExpression(node)) {
    // biome-ignore lint/complexity/noForEach: <explanation>
    node.getProperties().forEach((property) => {
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
  }

  // 递归遍历子节点
  node.forEachChild((child) => {
    identifiers.push(...extractChineseIdentifiers(child))
  })

  return identifiers
}

// 从文件根节点开始遍历
const astHandler = (path: string) => {
  const sourceFile = project.addSourceFileAtPath(path)
  return extractChineseIdentifiers(sourceFile)
}

export const astFilesCommand = (program: Command) => {
  program
    .command('ast [...dirnames]')
    .description('ast file which you choose')
    .action(async (dirnames: string, options) => {
      const files = fileList()
      if (files.length === 0) {
        // return log.success('file', '当前文件夹为空')
      }

      const cwd = process.cwd()
      const dirnamesTrim = dirnames?.trim()
      const delFilesList: string[] = []
      if (dirnamesTrim) {
        const dirList: string[] = parseNames(dirnames)
        delFilesList.push(...dirList)
      } else {
        const choices: string[] = await createCheckbox({
          message: 'Choose file you want to Delete',
          options: files.map((file) => ({
            value: file,
            label: file,
          })),
        })
        delFilesList.push(...choices)
      }
      if (!delFilesList.length) {
        return log.success('file', 'No file selected')
      }
      const result = delFilesList.map((dir) => `${cwd}/${dir}`)
      for (const file of result) {
        const chineseVars = astHandler(file)
        log.success('file', `file: ${file} 中文变量名：${chineseVars}`)
      }
    })
}
