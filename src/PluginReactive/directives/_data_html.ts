import type {
  DirectiveHandler,
} from '../reference.ts'
import { TEXT_MOD_HTML } from '../reference.ts'
import { _data } from './_data.ts'
import { _text } from './_text.ts'

export const _data_html: DirectiveHandler = (
  ctx,
  el,
  def,
) => {
  _data(ctx, el, def)
  def.mods.set(TEXT_MOD_HTML, undefined)
  _text(ctx, el, def)
}
