import {Ucom} from './core'
import CorePlugin from './plugins/CorePlugin.ts'
import DOMPlugin from './plugins/DOMPlugin.ts'
import RelativePlugin from './plugins/RelativePlugin.ts'
import ImportPlugin from './plugins/ImportPlugin.ts'
import StylePlugin from './plugins/StylePlugin.ts'
import VuePlugin from './plugins/VuePlugin.ts'

const ucom = Ucom([
  CorePlugin,
  DOMPlugin,
  RelativePlugin,
  ImportPlugin,
  StylePlugin,
  VuePlugin,
])
ucom.start()
