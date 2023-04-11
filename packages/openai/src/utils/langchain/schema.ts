import { ChatOpenAI } from 'langchain/chat_models'
import { HumanChatMessage, SystemChatMessage } from 'langchain/schema'

const chat = new ChatOpenAI({ temperature: 0 })
