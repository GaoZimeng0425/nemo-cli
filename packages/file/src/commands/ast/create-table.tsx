const createColumn = (text: string, style: { bold?: boolean } = {}) => {
  return {
    type: 'rich_text',
    elements: [
      {
        type: 'rich_text_section',
        elements: [
          {
            type: 'text',
            text: text,
            style,
          },
        ],
      },
    ],
  }
}

const createHeader = (text: string) => createColumn(text, { bold: true })

const createRow = (columns: { text: string; style?: { bold?: boolean } }[]) => {
  return columns.map(({ text, style }) => createColumn(text, style))
}

export const table = {
  type: 'table',
  rows: [
    [createHeader('列'), createHeader('新增词汇')],
    createRow([{ text: '1' }, { text: '2' }]),
    createRow([{ text: '2' }, { text: '4' }]),
    createRow([{ text: '3' }, { text: '6' }]),
  ],
}
