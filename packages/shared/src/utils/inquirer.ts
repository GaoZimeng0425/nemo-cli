import inquirer, { QuestionTypeName, QuestionCollection } from 'inquirer'

const BASE_CONFIG = {
  name: 'name',
  choices: [],
  message: '',
  require: true,
  mask: '*'
}

export const createType =
  <Name extends QuestionTypeName>(type: Name) =>
  async (questions: QuestionCollection, initialAnswers?: any) => {
    const answer = await inquirer.prompt({ ...BASE_CONFIG, ...questions, type }, initialAnswers)
    return answer[BASE_CONFIG['name']]
  }

export const createList = createType('list')

export const createNumberList = createType('rawlist')

export const createSelect = createType('list')

export const createInput = createType('input')

export const createPassword = createType('password')

export const createCheckbox = createType('checkbox')

export const createConfirm = createType('confirm')

export const createEditor = createType('editor')
