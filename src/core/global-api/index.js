/* @flow */

import config from '../config'
import * as util from '../util/index'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import builtInComponents from '../components/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      util.warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 在Vue上定义config属性，同时定义其getter和setter函数
  Object.defineProperty(Vue, 'config', configDef)
  Vue.util = util
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = util.nextTick

  Vue.options = Object.create(null)
  /**
   * component，directive，filter
   */
  config._assetTypes.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // 在components添加公共组件，为什么不放在外围与transition组件一起添加呢？？
  util.extend(Vue.options.components, builtInComponents)

  // 添加use函数，再添加插件时会使用到
  initUse(Vue)
  // 添加mixin函数，用来合并mixin选项，可以直接使用mixin函数进行混合
  // 并不能在Vue实例上进行调用，这个用处在哪里呢？？用来在Vue本身上添加属性
  initMixin(Vue)
  // 根据this创建一个子对象
  initExtend(Vue)
  initAssetRegisters(Vue)
}
