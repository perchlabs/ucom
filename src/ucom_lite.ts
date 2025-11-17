import Ucom from './ucom'
import CorePlugin from './plugins/CorePlugin.ts'
import TemplatePlugin from './plugins/TemplatePlugin.ts'
import RelativePlugin from './plugins/RelativePlugin.ts'
import ImportPlugin from './plugins/ImportPlugin.ts'
import StylePlugin from './plugins/StylePlugin.ts'

import HamsterioPlugin from './plugins/HamsterioPlugin.ts'

const ucom = Ucom([
  CorePlugin,
  TemplatePlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  HamsterioPlugin,
])
ucom.start()
