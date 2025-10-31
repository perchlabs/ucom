import Ucom from './ucom'
import {
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  HelperPlugin,
} from './plugins'

const ucom = new Ucom([
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  HelperPlugin,
])
ucom.start()
