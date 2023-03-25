import { log, ora } from '@nemo-cli/shared'
import { ChatCompletionRequestMessage, Configuration, OpenAIApi } from 'openai'

const AXIOS_OPTIONS: Parameters<OpenAIApi['createChatCompletion']>[1] = {
  timeout: 20000
}

const CONTENT: ChatCompletionRequestMessage[] = [
  { role: 'system', content: 'You are a helpful assistant.' },
  { role: 'user', content: 'Who won the world series in 2020?' },
  { role: 'assistant', content: 'The Los Angeles Dodgers won the World Series in 2020.' }
]
export const chatHandle = async (TOKEN: string, content: string) => {
  const configuration = new Configuration({
    apiKey: TOKEN
  })
  const openai = new OpenAIApi(configuration)

  CONTENT.push({ role: 'user', content })
  log.success('', content)
  try {
    const response = await openai.createChatCompletion(
      {
        model: 'gpt-3.5-turbo',
        messages: CONTENT,
        temperature: 0.8,
        max_tokens: 200
      },
      AXIOS_OPTIONS
    )
    const { message } = response.data.choices[0]
    log.success('', message)
    message && CONTENT.push(message)
    return message?.content ?? ''
  } catch (err) {
    log.error('error', (err as any)?.message)
  }
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
