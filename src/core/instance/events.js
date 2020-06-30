/* @flow */

import { bind, toArray } from '../util/index'
import { updateListeners } from '../vdom/helpers'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  // init parent attached events
  const listeners = vm.$options._parentListeners
  // 绑定事件监听函数的执行上下文为当前vue实例对象，在函数内部通过this即可引用vue实例
  const on = bind(vm.$on, vm)
  const off = bind(vm.$off, vm)
  vm._updateListeners = (listeners, oldListeners) => {
    updateListeners(listeners, oldListeners || {}, on, off)
  }
  if (listeners) {
    vm._updateListeners(listeners)
  }
}

export function eventsMixin (Vue: Class<Component>) {
  // $on指令代表向Vue对象的事件队列中添加相应的事件处理函数
  Vue.prototype.$on = function (event: string, fn: Function): Component {
    const vm: Component = this // 如果是第一次添加事件回调函数，则将事件回调函数设置为数组
    ;(vm._events[event] || (vm._events[event] = [])).push(fn)
    return vm
  }

  // $on, $off方法的组装
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on)
      fn.apply(vm, arguments)
    }
    on.fn = fn
    vm.$on(event, on)
    return vm
  }

  // JS重载函数的写法
  Vue.prototype.$off = function (event?: string, fn?: Function): Component {
    const vm: Component = this
    // all, 移除所有的事件监听函数队列，vm._events.__ptoto__ === null
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // specific event, 特定事件的回调函数队列
    const cbs = vm._events[event]
    if (!cbs) {
      return vm
    }
    // 移除该事件的所有回调函数
    if (arguments.length === 1) {
      vm._events[event] = null
      return vm
    }
    // specific handler
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }

  // 都是在同一个this对象上的话，如何区分同样的监听事件的不同回调函数呢？？
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    let cbs = vm._events[event]
    if (cbs) {
      // cbs本来就是数组，使用toArray转换好像并没有什么意义
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      const args = toArray(arguments, 1)
      for (let i = 0, l = cbs.length; i < l; i++) {
        cbs[i].apply(vm, args)
      }
    }
    return vm
  }
}
