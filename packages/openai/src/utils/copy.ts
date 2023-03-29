import clipboardy from 'clipboardy'

export const copy = (message: string) => {
  return clipboardy.write(message)
}
