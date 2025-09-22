import { client, HOST_WIKI } from '.'
import { content } from './template'

type CreatePageProps =
  | {
      id: number
      branch?: string
    }
  | {
      branch: string
      id?: number
    }

// const key = 'metalpha'
const key = '~712020570850765a59436b8457384faabb7240'
const folderID = '1169653790'

export const createPage = async ({ id, branch }: CreatePageProps) => {
  const title = id ? `PRIME-${id}` : branch
  const body = await content()
  try {
    const page = await client.content.createContent({
      ...body,
      ancestors: [{ id: folderID }],
      title: `提测工单: ${title}`,
      space: { key },
    })
    const { webui = '' } = page._links ?? { webui: '' }
    return `${HOST_WIKI}${webui}`
  } catch (error) {
    console.error(error)
    return null
  }
}
