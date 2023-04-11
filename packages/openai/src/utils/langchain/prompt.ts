import {
  AIMessagePromptTemplate,
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  PromptTemplate,
  SystemMessagePromptTemplate
} from 'langchain/prompts'

const template = 'What is a good name for a company that makes {product}?'
export const prompt = new PromptTemplate({
  template,
  inputVariables: ['product']
})

// await prompt
//   .formatPromptValue({
//     product: 'socks'
//   })
//   .then((resp) => {
//     console.log(resp.toChatMessages())
//   })

// prompt.format({ product: 'socks' }).then((resp) => {
//   console.log(resp)
// })

export const translationPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'You are a helpful assistant that translates {input_language} to {output_language}.'
  ),
  // AIMessagePromptTemplate.fromTemplate(
  //   'You are a helpful assistant that translates {input_language} to {output_language}.'
  // ),
  HumanMessagePromptTemplate.fromTemplate('{text}')
])
