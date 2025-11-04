import Ucom from './ucom'
import {
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  VuePlugin,
} from './plugins'

const ucom = new Ucom([
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  VuePlugin,
])
ucom.start()
