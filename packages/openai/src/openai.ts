import { isError, log, ora, safeAwait } from '@nemo-cli/shared'
import OpenAI from 'openai'

// TODO: USE LANG_CHAIN
// import { OpenAI } from 'langchain'
import { ERROR_MESSAGE } from './constants.js'
import { getModel } from './utils/store.js'

const AXIOS_OPTIONS: Parameters<OpenAI['chat']['completions']['create']>[1] = {
  timeout: 20000,
}

type RequestError = {
  response: { status: string }
} & Error

export const createOpenai = (TOKEN: string) => {
  const openai = new OpenAI({
    apiKey: TOKEN,
  })

  // const generatorChat = async (content: string) => {
  const generatorChat = async (messages: any[]) => {
    const [error, response] = await safeAwait(
      openai.chat.completions.create(
        {
          model: getModel() || 'gpt-3.5-turbo',
          messages,
          temperature: 0.8,
          max_tokens: 200,
        },
        AXIOS_OPTIONS
      )
    )
    if (isError(error)) {
      const message = (error as any)?.response?.data?.error?.message
      log.verbose('openai chat is Error', message)
      const status = (error as RequestError)?.response?.status
      log.verbose('message', ERROR_MESSAGE[status])
      throw new Error(message ?? ERROR_MESSAGE[status] ?? ERROR_MESSAGE.default)
    }
    const { message } = response?.choices[0] ?? {}
    return message?.content
  }
  return generatorChat
}

export const createCompletion = async (TOKEN: string, question: string): Promise<string> => {
  const openai = new OpenAI({
    apiKey: TOKEN,
  })
  const spinner = ora('completion')
  try {
    const response = await openai.completions.create(
      {
        model: 'text-davinci-003',
        prompt: question,
        temperature: 0.8,
        max_tokens: 200,
      },
      AXIOS_OPTIONS
    )
    const { text } = response?.choices[0] ?? {}
    return text ?? '无回答'
  } catch (err) {
    log.error('openai', (err as any).message)
    return '出错了'
  } finally {
    spinner.clear()
  }
}

export const listModels = async (TOKEN: string) => {
  const openai = new OpenAI({
    apiKey: TOKEN,
  })
  const spinner = ora('find models').start()

  try {
    const { data } = await openai.models.list()
    spinner.succeed()

    return data.map((model) => ({ name: model.id, value: model.id })) as { name: string; value: string }[]
  } catch (err) {
    spinner.fail(`error: ${err}`)
  }
}

export const retrieveModel = async (model: string, TOKEN: string) => {
  const openai = new OpenAI({
    apiKey: TOKEN,
  })
  try {
    const data = await openai.models.retrieve(model)
    return data
  } catch (err) {
    if (err instanceof Error) {
      console.log(err.message)
    }
    return null
  }
}
