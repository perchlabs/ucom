import Ucom from './ucom'
import {
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  HelperPlugin,
  VuePlugin,
} from './plugins'

const ucom = new Ucom([
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  HelperPlugin,
  VuePlugin,
])
ucom.start()
