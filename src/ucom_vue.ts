import comman from './comman.ts'
import PluginCore from './PluginCore.ts'
import PluginDOM from './PluginDOM.ts'
import PluginRelative from './PluginRelative.ts'
import PluginImport from './PluginImport.ts'
import PluginStyle from './PluginStyle.ts'
import PluginVue from './PluginVue'

const ucom = comman([
  PluginCore,
  PluginDOM,
  PluginRelative,
  PluginImport,
  PluginStyle,
  PluginVue,
])
ucom.start()
