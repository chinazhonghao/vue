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
      // resolveConstrucorOptions: 
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
    // 定义_updateListeners函数
    initEvents(vm)
    callHook(vm, 'beforeCreate')
    // 上面先把options进行合并，然后赋值到Vue实例vm上，这里根据vm上的选项进行初始化，分层很清晰
    // 为什么要在Object或者Array上定义Observer呢？Observer到底有什么用，实际的依赖相应应该是属性上面的，而且属性上面本身也有Sub可以进行依赖收集
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

  // 获取parent元素上的选项参数
  function resolveConstructorOptions (vm: Component) {
    const Ctor = vm.constructor
    let options = Ctor.options
    if (Ctor.super) {
      const superOptions = Ctor.super.options
      // 缓存其更上一层的选项，当缓存的对象和parent上的对象一致则不需要再次计算
      const cachedSuperOptions = Ctor.superOptions
      if (superOptions !== cachedSuperOptions) {
        // super option changed
        // 再次缓存parent上的选项
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
