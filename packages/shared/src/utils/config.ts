import path from 'node:path'
import { homedir } from 'node:os'
import { readJSON, writeJSON } from './file.js'
import { dirname } from './pathname.js'
import { CONFIG_NAME } from '../constants.js'

const __dirname = path.resolve(dirname(import.meta), '../..')
// const configPath = path.resolve(homedir(), CONFIG_NAME)
const configPath = path.resolve(__dirname, CONFIG_NAME)

export const changeConfig = async (props: Record<string, unknown>) => {
  const config = await getConfig()
  const content = JSON.stringify({
    ...config,
    ...props
  })
  return writeJSON(configPath, content)
}
export const getConfig = () => readJSON(configPath)
