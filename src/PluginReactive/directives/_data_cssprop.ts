import type {
  DirectiveHandler,
} from '../reference.ts'
import { _data } from './_data.ts'
import { _cssprop } from './_cssprop.ts'

export const _data_cssprop: DirectiveHandler = (
  ctx,
  el,
  def,
) => {
  _data(ctx, el, def)
  _cssprop(ctx, el, {
    ...def,
    exp: '',
  })
}
