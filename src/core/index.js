import config from './config'
import { initGlobalAPI } from './global-api/index'
// 进一步导入Vue
import Vue from './instance/index'

// 给Vue本身定义一些API
initGlobalAPI(Vue)

// 在Vue原型上定义$isServer属性，通过process.env.VUE_ENV来标记是否时服务器环境
Object.defineProperty(Vue.prototype, '$isServer', {
  get: () => config._isServer
})

Vue.version = '2.0.0'

export default Vue
