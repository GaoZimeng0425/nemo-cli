import { ora } from '@nemo-cli/shared'
import { Configuration, OpenAIApi } from 'openai'
import { TOKEN } from './constants.js'

const configuration = new Configuration({
  apiKey: TOKEN
})
const openai = new OpenAIApi(configuration)

const AXIOS_OPTIONS: Parameters<typeof openai.createCompletion>[1] = {
  timeout: 10000
}

export const chat = async () => {
  const response = await openai.createChatCompletion(
    {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Who won the world series in 2020?' },
        { role: 'assistant', content: 'The Los Angeles Dodgers won the World Series in 2020.' },
        { role: 'user', content: 'Where was it played?' }
      ],
      temperature: 0.8,
      max_tokens: 200
    },
    AXIOS_OPTIONS
  )
  return response.data.choices[0]
}

export const createCompletion = async (question?: string): Promise<string> => {
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
    console.log(response.data.choices[0])
    return response.data.choices[0]?.text ?? '无回答'
  } catch (err) {
    return '出错了'
  } finally {
    spinner.clear()
  }
}

export const listModels = async () => {
  const spinner = ora('find models').start()

  try {
    const { data } = await openai.listModels(AXIOS_OPTIONS)
    spinner.succeed()
    console.log(data)

    return data
  } catch (err) {
    spinner.fail(`error: ${err}`)
  }
}

export const retrieveModel = async (model: string) => {
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
