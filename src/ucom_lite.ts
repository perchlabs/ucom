import Ucom from './ucom'
import {
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
} from './plugins'

const ucom = new Ucom([
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
])
ucom.start()
