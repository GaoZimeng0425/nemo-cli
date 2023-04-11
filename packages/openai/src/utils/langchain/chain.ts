import { LLMChain } from 'langchain/chains'
import { model } from './model'
import { prompt, translationPrompt } from './prompt'

const chain = new LLMChain({ llm: model, prompt })

chain.call({})

const chain2 = new LLMChain({
  prompt: translationPrompt,
  llm: model
})
