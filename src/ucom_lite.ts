import comman from './comman.ts'
import pluginCore from './PluginCore.ts'
import pluginDOM from './PluginDOM.ts'
import pluginRelative from './PluginRelative.ts'
import pluginImport from './PluginImport.ts'
import pluginStyle from './PluginStyle.ts'

const ucom = comman([
  pluginCore,
  pluginDOM,
  pluginRelative,
  pluginImport,
  pluginStyle,
])
ucom.start()
