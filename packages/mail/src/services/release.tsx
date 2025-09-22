// biome-ignore lint/correctness/noUnusedImports: need for react-email
import React from 'react'
import {
  Body,
  Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  pixelBasedPreset,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components'

type ReleaseEmailProps = {
  docLink: string
  id: number
  title: string
}
export const ReleaseEmail = ({ docLink, title, id }: ReleaseEmailProps) => {
  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          presets: [pixelBasedPreset],
        }}
      >
        <Body className="mx-auto my-auto bg-white px-2 font-sans">
          <Preview>Release Email</Preview>
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-[#eaeaea] border-solid p-[20px]">
            <Section className="mt-[32px]">
              <Img
                alt="Vercel Logo"
                className="mx-auto my-0"
                height="37"
                src="https://github.com/user-attachments/assets/7bc8f7c1-1877-4ddd-89f9-4f8d9bc32ed5"
                width="40"
              />
            </Section>
            <Heading className="mx-0 my-[30px] p-0 text-center font-normal text-[24px] text-black">{title}</Heading>
            <Text className="text-[14px] text-black leading-[24px]">Hello Team,</Text>
            <Text className="text-[14px] text-black leading-[24px]">
              <b>zimeng.gao</b> (
              <Link className="text-blue-600 no-underline" href={`mailto:${'zimeng.gao@antalpha.com'}`}>
                {'zimeng.gao@antalpha.com'}
              </Link>
              ) <b>PRIME-{id}</b> requirements application for <b>pre-release/official</b> environment.
            </Text>
            <Section>
              <Row>
                <Column align="right">
                  <Img
                    alt={`zimeng.gao's profile picture`}
                    className="rounded-full"
                    height="64"
                    src="https://github.com/user-attachments/assets/7bc8f7c1-1877-4ddd-89f9-4f8d9bc32ed5"
                    width="64"
                  />
                </Column>
                <Column align="center">
                  <Img
                    alt="Arrow indicating invitation"
                    height="9"
                    src="https://github.com/user-attachments/assets/7bc8f7c1-1877-4ddd-89f9-4f8d9bc32ed5"
                    width="12"
                  />
                </Column>
                <Column align="left">
                  <Img
                    alt={'Nemo team logo'}
                    className="rounded-full"
                    height="64"
                    src="https://github.com/user-attachments/assets/7bc8f7c1-1877-4ddd-89f9-4f8d9bc32ed5"
                    width="64"
                  />
                </Column>
              </Row>
            </Section>
            <Section className="mt-[32px] mb-[32px] text-center">
              <Button
                className="rounded bg-[#000000] px-5 py-3 text-center font-semibold text-[12px] text-white no-underline"
                href={docLink}
              >
                上线工单
              </Button>
            </Section>
            <Hr className="mx-0 my-[26px] w-full border border-[#eaeaea] border-solid" />

            <Text className="text-[#666666] text-[12px] leading-[24px]">如何无法打开上线工单，请点击以下链接：</Text>
            <Link href={docLink}>{docLink}</Link>

            <Text className="text-[#666666] text-[12px] leading-[24px]">
              This invitation was intended for <span className="text-black">zimeng.gao@antalpha.com</span>. This invite
              was sent from <span className="text-black">xx.xx.xx.xx</span> located in{' '}
              <span className="text-black">Beijing, China</span>. If you were not expecting this invitation, you can
              ignore this email. If you are concerned about your account's safety, please reply to this email to get in
              touch with us.
            </Text>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  )
}
