import { OpenAI } from 'langchain/llms'

export const model = new OpenAI({
  openAIApiKey: 'AskMyBook',
  temperature: 0.9
})

// const res = await model.call(
//   'What would be a good company name a company that makes colorful socks?'
// )
// console.log(res)
