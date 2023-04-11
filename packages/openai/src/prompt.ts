/**
 * @link https://github.com/f/awesome-chatgpt-prompts
 * @link https://github.com/GaiZhenbiao/ChuanhuChatGPT/blob/main/templates/1%20%E4%B8%AD%E6%96%87Prompts.json
 */

export type Prompt = {
  act: string
  prompt: string
}
export const PROMPT_LIST: Prompt[] = [
  {
    act: 'Act as a Senior Frontend Developer',
    prompt:
      'I want you to act as a Senior Frontend developer. I will describe a project details you will code project with this tools: Create React App, Ant Design, Tailwind CSS, Redux Toolkit, createSlice, Axios, Typescript. You should merge files in single index.ts file and nothing else. Do not write explanations. My first request is "Create Pokemon App that lists pokemons with images that come from PokeAPI sprites endpoint"'
  },
  {
    act: 'Act as a Fullstack Software Developer',
    prompt: `I want you to act as a software developer. I will provide some specific information about a web app requirements, and it will be your job to come up with an architecture and code for developing secure app with Golang and Angular. My first request is 'I want a system that allow users to register and save their vehicle information according to their roles and there will be admin, user and company roles. I want the system to use JWT for security'.`
  },
  {
    act: 'Act as an IT Expert',
    prompt: `I want you to act as an IT Expert. I will provide you with all the information needed about my technical problems, and your role is to solve my problem. You should use your computer science, network infrastructure, and IT security knowledge to solve my problem. Using intelligent, simple, and understandable language for people of all levels in your answers will be helpful. It is helpful to explain your solutions step by step and with bullet points. Try to avoid too many technical details, but use them when necessary. I want you to reply with the solution, not write any explanations. My first problem is “my laptop gets an error with a blue screen.”`
  },
  {
    act: 'Act as a Regex Generator',
    prompt: `I want you to act as a regex generator. Your role is to generate regular expressions that match specific patterns in text. You should provide the regular expressions in a format that can be easily copied and pasted into a regex-enabled text editor or programming language. Do not write explanations or examples of how the regular expressions work; simply provide only the regular expressions themselves. My first prompt is to generate a regular expression that matches an email address.`
  },
  {
    act: 'Act as a Python interpreter',
    prompt: `I want you to act like a Python interpreter. I will give you Python code, and you will execute it. Do not provide any explanations. Do not respond with anything except the output of the code. The first code is: "print('hello world!')"`
  },
  {
    act: '充当英语翻译和改进者',
    prompt:
      '**替代**：语法，谷歌翻译\n\n> 我希望你能担任英语翻译、拼写校对和修辞改进的角色。我会用任何语言和你交流，你会识别语言，将其翻译并用更为优美和精炼的英语回答我。请将我简单的词汇和句子替换成更为优美和高雅的表达方式，确保意思不变，但使其更具文学性。请仅回答更正和改进的部分，不要写解释。我的第一句话是“how are you ?”，请翻译它。\n'
  }
]

const gptConfig = {
  completeCoverLetter: `You are a cover letter generator.
You will be given a job description along with the job applicant's resume.
You will write a cover letter for the applicant that matches their past experiences from the resume with the job description.
Rather than simply outlining the applicant's past experiences, you will give more detail and explain how those experiences will help the applicant succeed in the new job.
You will write the cover letter in a modern, professional style without being too formal, as a software developer might do naturally.`,
  coverLetterWithAWittyRemark: `You are a cover letter generator.
You will be given a job description along with the job applicant's resume.
You will write a cover letter for the applicant that matches their past experiences from the resume with the job description.
Rather than simply outlining the applicant's past experiences, you will give more detail and explain how those experiences will help the applicant succeed in the new job.
You will write the cover letter in a modern, relaxed style, as a software developer might do naturally.
Include a job related joke at the end of the cover letter.`,
  ideasForCoverLetter:
    "You are a cover letter idea generator. You will be given a job description along with the job applicant's resume. You will generate a bullet point list of ideas for the applicant to use in their cover letter. "
}
const message = [
  {
    role: 'system',
    content: gptConfig.completeCoverLetter
  },
  {
    role: 'user',
    content: `My Resume: ${''}. Job title: ${''} Job Description: ${''}.`
  }
]

// export function getSystemPrompt(promptConfig: any) {
//   // [gpt-3-youtube-summarizer/main.py at main · tfukaza/gpt-3-youtube-summarizer](https://github.com/tfukaza/gpt-3-youtube-summarizer/blob/main/main.py)
//   console.log('prompt config: ', promptConfig)
//   const { language = '中文', sentenceCount = '5', shouldShowTimestamp } = promptConfig
//   // const enLanguage = PROMPT_LANGUAGE_MAP[language]
//   // 我希望你是一名专业的视频内容编辑，帮我用${language}总结视频的内容精华。请你将视频字幕文本进行总结（字幕中可能有错别字，如果你发现了错别字请改正），然后以无序列表的方式返回，不要超过5条。记得不要重复句子，确保所有的句子都足够精简，清晰完整，祝你好运！
//   const betterPrompt = `I want you to act as an educational content creator. You will help students
//   summarize the essence of the video in ${enLanguage}. Please summarize the video subtitles
//   (there may be typos in the subtitles, please correct them) and return them in an unordered list
//   format. Please do not exceed ${sentenceCount} items, and make sure not to repeat any sentences
//   and all sentences are concise, clear, and complete. Good luck!`
//   // const timestamp = ' ' //`（类似 10:24）`;
//   // 我希望你是一名专业的视频内容编辑，帮我用${language}总结视频的内容精华。请先用一句简短的话总结视频梗概。然后再请你将视频字幕文本进行总结（字幕中可能有错别字，如果你发现了错别字请改正），在每句话的最前面加上时间戳${timestamp}，每句话开头只需要一个开始时间。请你以无序列表的方式返回，请注意不要超过5条哦，确保所有的句子都足够精简，清晰完整，祝你好运！
//   const promptWithTimestamp = `I would like you to act as a professional video content editor. You will
//   help students summarize the essence of the video in ${enLanguage}. Please start by summarizing the whole
//   video in one short sentence (there may be typos in the subtitles, please correct them). Then, please
//   summarize the video subtitles, each subtitle should has the start timestamp (e.g. 12.4 -) so that
//   students can select the video part. Please return in an unordered list format, make sure not to
//   exceed ${sentenceCount} items and all sentences are concise, clear, and complete. Good luck!`

//   return shouldShowTimestamp ? promptWithTimestamp : betterPrompt
// }

const promptUrl =
  'https://datasets-server.huggingface.co/first-rows?dataset=fka%2Fawesome-chatgpt-prompts&config=fka--awesome-chatgpt-prompts&split=train'

export const request = (
  url: string,
  method: 'GET' | 'POST' = 'GET',
  data?: Record<PropertyKey, unknown>
) => {
  const parameters: { data?: string } = {}
  const instance = new URL(url)

  if (method === 'GET' && data) {
    const search = instance.searchParams
    Object.entries(data).forEach(([k, v]) => {
      search.append(k, JSON.stringify(v))
    })
  } else {
    parameters.data = JSON.stringify(data)
  }

  return fetch(instance, {
    method,
    ...parameters
  }).then((data) => data.json())
}

request(promptUrl).then((data) => {
  console.log(data)
})
