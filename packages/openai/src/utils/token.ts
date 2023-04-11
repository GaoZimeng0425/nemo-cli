import GPT3Default from 'gpt3-tokenizer'

const GPT3Tokenizer = GPT3Default.default
const tokenizer = new GPT3Tokenizer({ type: 'gpt3' })

export const optimism = {
  query: (query: string) => {
    const input = query.replace(/\n/g, ' ')
    return input
  },
  tokenizer(content: string) {
    const encoded = tokenizer.encode(content)
    if (encoded.text.length > 100) {
      throw new Error('Out Limit')
    }
    return content.trim()
  }
}
