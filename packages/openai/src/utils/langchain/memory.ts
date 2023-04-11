import { OpenAI } from 'langchain/llms'
import { BufferMemory } from 'langchain/memory'
import { ConversationChain } from 'langchain/chains'
import {
  ChatPromptTemplate,
  HumanMessagePromptTemplate,
  MessagesPlaceholder,
  SystemMessagePromptTemplate
} from 'langchain/prompts'

// const model = new OpenAI({})
// const memory = new BufferMemory()
// export const chain = new ConversationChain({ llm: model, memory })
// const res1 = await chain.call({ input: "Hi! I'm Jim." })
// console.log(res1)

const memory = new BufferMemory({ returnMessages: true, memoryKey: 'history' })
memory.chatHistory.addUserMessage("Hi! I'm Jim.")

const chatPrompt = ChatPromptTemplate.fromPromptMessages([
  SystemMessagePromptTemplate.fromTemplate(
    'The following is a friendly conversation between a human and an AI. The AI is talkative and provides lots of specific details from its context. If the AI does not know the answer to a question, it truthfully says it does not know.'
  ),
  new MessagesPlaceholder('history'),
  HumanMessagePromptTemplate.fromTemplate('{input}')
])
const messages = chatPrompt.serialize()
console.log(messages)
