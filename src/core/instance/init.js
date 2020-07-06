/* @flow */
// flow.js用法：https://segmentfault.com/a/1190000006983211
// 官网：https://flow.org/

import { initProxy } from './proxy'
import { initState } from './state'
import { initRender } from './render'
import { initEvents } from './events'
import { initLifecycle, callHook } from './lifecycle'
import { mergeOptions } from '../util/index'

let uid = 0

export function initMixin (Vue: Class<Component>) {
  // 参数options即是通过new Vue({})传入的参数
  // Vue已经定义过了，在index.js里面声明了Vue函数（通过instanceOf限制其成为构造函数)
  // new Vue({})时，调用了这个_init函数
  Vue.prototype._init = function (options?: Object) {
    // 通过new进行调用，this指向新创建的Vue对象
    const vm: Component = this
    // 在实例上定义一些属性
    // a uid
    vm._uid = uid++
    // a flag to avoid this being observed
    // 通过这个属性来判断是否是vue实例，为什么不通过proto进行判断呢？？性能考虑吗
    vm._isVue = true
    // merge options
    // 将new Vue({})时传入的参数挂载到实例的$options属性上
    if (options && options._isComponent) {
      // optimize internal component instantiation
      // since dynamic options merging is pretty slow, and none of the
      // internal component options needs special treatment.
      initInternalComponent(vm, options)
    } else {
      vm.$options = mergeOptions(
        resolveConstructorOptions(vm),
        options || {},
        vm
      )
    }
    /* istanbul ignore else */
    // 这里只是对render方法进行代理
    if (process.env.NODE_ENV !== 'production') {
      initProxy(vm)
    } else {
      vm._renderProxy = vm
    }
    // expose real self
    // 为什么要这么赋值一下呢？？
    vm._self = vm
    initLifecycle(vm)
    initEvents(vm)
    callHook(vm, 'beforeCreate')
    initState(vm)
    callHook(vm, 'created')
    initRender(vm)
  }

  function initInternalComponent (vm: Component, options: InternalComponentOptions) {
    const opts = vm.$options = Object.create(resolveConstructorOptions(vm))
    // doing this because it's faster than dynamic enumeration.
    opts.parent = options.parent
    opts.propsData = options.propsData
    opts._parentVnode = options._parentVnode
    opts._parentListeners = options._parentListeners
    opts._renderChildren = options._renderChildren
    opts._componentTag = options._componentTag
    if (options.render) {
      opts.render = options.render
      opts.staticRenderFns = options.staticRenderFns
    }
  }

  function resolveConstructorOptions (vm: Component) {
    const Ctor = vm.constructor
    let options = Ctor.options
    if (Ctor.super) {
      const superOptions = Ctor.super.options
      const cachedSuperOptions = Ctor.superOptions
      if (superOptions !== cachedSuperOptions) {
        // super option changed
        Ctor.superOptions = superOptions
        options = Ctor.options = mergeOptions(superOptions, Ctor.extendOptions)
        if (options.name) {
          options.components[options.name] = Ctor
        }
      }
    }
    return options
  }
}
