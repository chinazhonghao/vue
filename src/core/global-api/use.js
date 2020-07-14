/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | Object) {
    /* istanbul ignore if */
    // 如果插件已经installed了，则直接返回
    if (plugin.installed) {
      return
    }
    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)
    // 1. 支持plugin本身是一个函数，则调用这个函数
    // 2. 在plugin上定义install属性，是一个函数
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else {
      plugin.apply(null, args)
    }
    // 设置标志位，避免重复添加
    plugin.installed = true
    return this
  }
}
