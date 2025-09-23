import { client, HOST_WIKI } from '.'

const RELEASE_TITLE = '提测&上线单'
const TRACK_TITLE = '需求跟踪'

type FuzzySearchContentProps = {
  id: number
  release?: boolean
  track?: boolean
}

export const fuzzySearchContent = async ({ id, release = false, track = false }: FuzzySearchContentProps) => {
  const titles = ['PRIME', id]

  if (release) {
    titles.unshift(RELEASE_TITLE)
  } else if (track) {
    titles.unshift(TRACK_TITLE)
  }

  const contents = await client.content.searchContentByCQL({
    cql: `title~"${titles.join('-')}"`,
    cqlcontext: '{"spaceKey":"metalpha","type":"page"}',
  })

  if (!contents?.results?.length) return null
  const PRD = contents.results.sort((doc1, doc2) => Number.parseInt(doc1.id, 10) - Number.parseInt(doc2.id, 10))[0]
  const webui = `${HOST_WIKI}${PRD?._links?.webui}`

  return {
    ...PRD,
    webui,
  }
}
export const getContentByID = async (id: string) => {
  const content = await client.content.getContentById({ id })
  return content
}
