import { render } from 'ink'
import InkBigText from 'ink-big-text'
import Gradient from 'ink-gradient'

export const BigText = ({ text }: { text: string }) =>
  render(
    <Gradient name="passion">
      <InkBigText text={text} />
    </Gradient>
  )
