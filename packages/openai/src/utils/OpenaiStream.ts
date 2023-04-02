// https://github.com/gannonh/gpt3.5-turbo-pgvector/blob/master/utils/OpenAIStream.ts
import { createParser, ParsedEvent, ReconnectInterval } from 'eventsource-parser'

export interface OpenAIStreamPayload {
  model: string
  messages: { role: string; content: string }[]
  temperature: number
  top_p: number
  frequency_penalty: number
  presence_penalty: number
  max_tokens: number
  stream: boolean
  n: number
}

const requestOpenai = (APIKey: string, payload: OpenAIStreamPayload) => {
  return fetch('https://api.openai.com/v1/chat/completions', {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${APIKey}`
    },
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function OpenAIStream(APIKey: string, payload: OpenAIStreamPayload) {
  const encoder = new TextEncoder()
  const decoder = new TextDecoder()

  const res = await requestOpenai(APIKey, payload)

  const stream = new ReadableStream({
    async start(controller) {
      // callback
      function onParse(event: ParsedEvent | ReconnectInterval) {
        if (event.type === 'event') {
          const data = event.data
          if (data === '[DONE]') {
            controller.close()
            return
          }
          try {
            const json = JSON.parse(data)
            // console.log('JSON.parse(data): ', json)
            const content = json.choices[0].delta.content
            // console.log("content: ", content);
            const queue = encoder.encode(content)
            controller.enqueue(queue)
          } catch (e) {
            // maybe parse error
            controller.error(e)
          }
        }
      }

      // stream response (SSE) from OpenAI may be fragmented into multiple chunks
      // this ensures we properly read chunks and invoke an event for each SSE event stream
      const parser = createParser(onParse)
      // https://web.dev/streams/#asynchronous-iteration
      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk))
      }
    }
  })

  return stream
}

export const readStream = async (stream: ReadableStream, cb?: (content: string) => unknown) => {
  const decoder = new TextDecoder()
  const reader = stream.getReader()
  let result = ''
  while (true) {
    const { done, value } = await reader.read()
    const content = decoder.decode(value)
    content && cb?.(content)
    result += content
    if (done) break
  }
  return result
}
