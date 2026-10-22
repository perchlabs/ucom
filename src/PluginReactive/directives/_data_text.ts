import type {
  DirectiveHandler,
} from '../reference.ts'
import { _data } from './_data.ts'
import { _text } from './_text.ts'

export const _data_text: DirectiveHandler = (
  ctx,
  el,
  def,
) => {
  _data(ctx, el, def)
  _text(ctx, el, def)
}
