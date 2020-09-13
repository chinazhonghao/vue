/* @flow */

// 在Vue进一步封装，方便进行调试等操作，之后的逻辑都是在这个对象上面做扩展
import Vue from 'core/index'
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { devtools, inBrowser } from 'core/util/index'
import { patch } from 'web/runtime/patch'
import platformDirectives from 'web/runtime/directives/index'
import platformComponents from 'web/runtime/components/index'
import {
  query,
  isUnknownElement,
  isReservedTag,
  getTagNamespace,
  mustUseProp
} from 'web/util/index'

// install platform specific utils
Vue.config.isUnknownElement = isUnknownElement
Vue.config.isReservedTag = isReservedTag
Vue.config.getTagNamespace = getTagNamespace
Vue.config.mustUseProp = mustUseProp

// install platform runtime directives & components
// 添加v-model，v-show指令
extend(Vue.options.directives, platformDirectives)
// 添加公共组件：Transition, TransitionGroup
extend(Vue.options.components, platformComponents)

// install platform patch function
// 根据不同的平台创建patch函数，个人认为创建patch函数不需要单独写到另一个文件中，毕竟逻辑不算复杂
Vue.prototype.__patch__ = config._isServer ? noop : patch

// wrap mount -- 可以被runtime-only的编译方式直接复用的；hydrating和服务端渲染有关
// 在上一层进一步被封装
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && !config._isServer ? query(el) : undefined
  return this._mount(el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
setTimeout(() => {
  if (config.devtools) {
    if (devtools) {
      devtools.emit('init', Vue)
    } else if (
      process.env.NODE_ENV !== 'production' &&
      inBrowser && /Chrome\/\d+/.test(window.navigator.userAgent)
    ) {
      console.log(
        'Download the Vue Devtools for a better development experience:\n' +
        'https://github.com/vuejs/vue-devtools'
      )
    }
  }
}, 0)

export default Vue
