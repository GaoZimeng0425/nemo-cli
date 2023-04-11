import { OpenAI } from 'langchain/llms'
import { loadSummarizationChain, AnalyzeDocumentChain } from 'langchain/chains'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import * as fs from 'fs'

import { prompt } from './prompt'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
const __dirname = dirname(fileURLToPath(import.meta.url))
const file = resolve(__dirname, 'state_of_the_union.txt')
const text = fs.readFileSync(file, 'utf8')
const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 })
const docs = await textSplitter.createDocuments([text])
console.warn('[高子蒙] : file: summarization.ts:13 : docs:', docs)

export const run = async () => {
  // In this example, we use a `MapReduceDocumentsChain` specifically prompted to summarize a set of documents.
  const model = new OpenAI({ temperature: 0 })
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 })
  const docs = await textSplitter.createDocuments([text])
  console.warn('[高子蒙] : file: summarization.ts:13 : docs:', docs)

  // This convenience function creates a document chain prompted to summarize a set of documents.
  const combineDocumentsChain = loadSummarizationChain(model, { prompt })
  const chain = new AnalyzeDocumentChain({
    combineDocumentsChain
  })
  const res = await chain.call({
    inputKey: 'inputDoc',
    inputDoc: docs,
    outputKey: 'outputDoc'
  })
  console.log({ res })
  /*
  {
    res: {
      text: ' President Biden is taking action to protect Americans from the COVID-19 pandemic and Russian aggression, providing economic relief, investing in infrastructure, creating jobs, and fighting inflation.
      He is also proposing measures to reduce the cost of prescription drugs, protect voting rights, and reform the immigration system. The speaker is advocating for increased economic security, police reform, and the Equality Act, as well as providing support for veterans and military families.
      The US is making progress in the fight against COVID-19, and the speaker is encouraging Americans to come together and work towards a brighter future.'
    }
  }
  */
}
