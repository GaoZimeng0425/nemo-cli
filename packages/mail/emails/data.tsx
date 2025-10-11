// biome-ignore lint/correctness/noUnusedImports: need for react-email
import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  pixelBasedPreset,
  Row,
  Section,
  Tailwind,
} from '@react-email/components'

type DataPageProps = {
  docLink: string
  id: number
  title: string
}
export const DataPage = ({ title }: DataPageProps) => {
  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>上线邮件</Preview>
          <Container className="mx-auto my-10 max-w-lg rounded border border-[#eaeaea] border-solid p-5">
            <Heading className="mx-0 my-5 p-0 text-center font-normal text-[24px] text-black">{title}</Heading>

            <Section>
              <Row>
                <table className="w-full border-collapse border border-[#eaeaea]">
                  <thead className="bg-[#f0f0f0]">
                    <tr>
                      <th className="border border-[#eaeaea] px-4 py-2">Column 1</th>
                      <th className="border border-[#eaeaea] px-4 py-2">Column 2</th>
                      <th className="border border-[#eaeaea] px-4 py-2">Column 3</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-[#eaeaea] px-4 py-2">Row 1, Column 1</td>
                      <td className="border border-[#eaeaea] px-4 py-2">Row 1, Column 2</td>
                      <td className="border border-[#eaeaea] px-4 py-2">Row 1, Column 3</td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="border border-[#eaeaea] px-4 py-2">Row 1, Column 1</td>
                      <td className="border border-[#eaeaea] px-4 py-2">Row 1, Column 2</td>
                      <td className="border border-[#eaeaea] px-4 py-2">Row 1, Column 3</td>
                    </tr>
                  </tfoot>
                </table>
              </Row>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}

export default DataPage
