/* @flow */

import config from '../config'
import { warn, mergeOptions } from '../util/index'

export function initExtend (Vue: GlobalAPI) {
  /**
   * Each instance constructor, including Vue, has a unique
   * cid. This enables us to create wrapped "child
   * constructors" for prototypal inheritance and cache them.
   */
  Vue.cid = 0
  let cid = 1

  /**
   * Class inheritance
   */
  // 为什么要创建子对象呢？？直接使用Vue不行吗
  Vue.extend = function (extendOptions: Object): Function {
    extendOptions = extendOptions || {}
    // 调用方式Vue.extend(option), this为Vue对象， option为一个组件对象
    const Super = this
    // cid为零表示Vue本身
    const isFirstExtend = Super.cid === 0
    if (isFirstExtend && extendOptions._Ctor) {
      return extendOptions._Ctor
    }
    let name = extendOptions.name || Super.options.name
    if (process.env.NODE_ENV !== 'production') {
      if (!/^[a-zA-Z][\w-]*$/.test(name)) {
        warn(
          'Invalid component name: "' + name + '". Component names ' +
          'can only contain alphanumeric characaters and the hyphen.'
        )
        name = null
      }
    }
    // 子组件也是一个Vue实例，这里定义Sub函数来构造子组件， 通过new Sub(options)来调用
    const Sub = function VueComponent (options) {
      this._init(options)
    }
    // 以super的原型创建一个对象，形成原型链
    Sub.prototype = Object.create(Super.prototype)
    // 原型上的constructor指向构造函数本身
    Sub.prototype.constructor = Sub
    Sub.cid = cid++
    // 这样合并，子组件应该可以访问父元素的属性，不过super是Vue而不是Vue实例，option是构造函数上的属性，而不是对象上属性
    Sub.options = mergeOptions(
      Super.options,
      extendOptions
    )
    Sub['super'] = Super
    // allow further extension
    Sub.extend = Super.extend
    // create asset registers, so extended classes
    // can have their private assets too.
    config._assetTypes.forEach(function (type) {
      Sub[type] = Super[type]
    })
    // enable recursive self-lookup
    if (name) {
      Sub.options.components[name] = Sub
    }
    // keep a reference to the super options at extension time.
    // later at instantiation we can check if Super's options have
    // been updated.
    Sub.superOptions = Super.options
    Sub.extendOptions = extendOptions
    // cache constructor
    if (isFirstExtend) {
      extendOptions._Ctor = Sub
    }
    return Sub
  }
}
