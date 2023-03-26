import { Configuration, OpenAIApi } from 'openai'
import { log, ora } from '@nemo-cli/shared'
// TODO: USE LANG_CHAIN
// import { OpenAI } from 'langchain'
import { Prompt } from './prompt.js'
import { getContext, addContext, initializationPrompt } from './utils/context.js'
import { sleep } from 'zx'
import { mockAnswer } from './utils/mock.js'
import boxen from 'boxen'

const AXIOS_OPTIONS: Parameters<OpenAIApi['createChatCompletion']>[1] = {
  timeout: 20000
}

export const createOpenai = (TOKEN: string, prompt: Prompt) => {
  const configuration = new Configuration({
    apiKey: TOKEN
  })
  const openai = new OpenAIApi(configuration)
  initializationPrompt(prompt)
  log.verbose('chat init prompt', getContext())

  const generatorChat = async (content: string) => {
    addContext(content)
    log.verbose('chat add content', content)

    const spinner = ora({
      hideCursor: true,
      text: boxen(`Loading...`, { padding: 1, margin: { top: 1 } })
    }).start()

    try {
      const response = await openai.createChatCompletion(
        {
          model: 'gpt-3.5-turbo',
          messages: getContext(),
          temperature: 0.8,
          max_tokens: 200
        },
        AXIOS_OPTIONS
      )
      const { message } = response.data.choices[0]
      log.verbose('chat response message', message)
      spinner.stop()
      message && addContext(message)
    } catch (err) {
      addContext({ role: 'system', content: 'something error' })
      log.error('error', (err as any)?.message)
      spinner.stop()
      process.exit(0)
    }
  }
  return generatorChat
}

export const createCompletion = async (TOKEN: string, question: string): Promise<string> => {
  const configuration = new Configuration({
    apiKey: TOKEN
  })
  const openai = new OpenAIApi(configuration)
  const spinner = ora('completion')
  try {
    const response = await openai.createCompletion(
      {
        model: 'text-davinci-003',
        prompt: question,
        temperature: 0.8,
        max_tokens: 200
      },
      AXIOS_OPTIONS
    )
    return response.data.choices[0]?.text ?? '无回答'
  } catch (err) {
    log.error('openai', (err as any).message)
    return '出错了'
  } finally {
    spinner.clear()
  }
}

export const listModels = async (TOKEN: string) => {
  const configuration = new Configuration({
    apiKey: TOKEN
  })
  const openai = new OpenAIApi(configuration)
  const spinner = ora('find models').start()

  try {
    const { data } = await openai.listModels(AXIOS_OPTIONS)
    spinner.succeed()
    console.log(data.data)

    return data.data.map((model) => ({ name: model.object, value: model.object }))
  } catch (err) {
    spinner.fail(`error: ${err}`)
  }
}

export const retrieveModel = async (model: string, TOKEN: string) => {
  const configuration = new Configuration({
    apiKey: TOKEN
  })
  const openai = new OpenAIApi(configuration)
  try {
    const { data } = await openai.retrieveModel(model)
    return data
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message)
    }
    return null
  }
}
