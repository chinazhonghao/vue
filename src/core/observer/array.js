/*
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { def } from '../util/index'

const arrayProto = Array.prototype
// 继承arrayProto，在后续对象上继续定义新方法，避免后续直接在数组对象上覆盖__proto__对象时出现问题
export const arrayMethods = Object.create(arrayProto)

/**
 * Intercept mutating methods and emit events
 */
// 在原先数组的方法基础上，重新定义7个方法
;[
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]
.forEach(function (method) {
  // cache original method
  const original = arrayProto[method]
  // 在arrayMethods对象上定义method属性，也就是增加新的方法
  def(arrayMethods, method, function mutator () {
    // avoid leaking arguments:
    // http://jsperf.com/closure-with-arguments
    // 直接使用arguments存在内容泄漏和V8引擎进行优化的问题，参考：
    // https://stackoverflow.com/questions/30234908/javascript-v8-optimisation-and-leaking-arguments
    // https://github.com/nodejs/node/pull/4361
    // 主要是直接传递arguments给下一个函数会存在问题：original.apply的传递过程
    let i = arguments.length
    const args = new Array(i)
    while (i--) {
      args[i] = arguments[i]
    }
    // 封装的新的数组方法，首先调用原生的数组方法
    const result = original.apply(this, args)
    // 每一个对象都会包装成Observer对象，对其属性使用Object.defineProperty定义getter和setter函数
    const ob = this.__ob__
    // 为什么这里要对参数进行选择和观察呢？？--重新观察新插入数据的部分，这样不用遍历全部的数组部分
    let inserted
    switch (method) {
      case 'push':
        inserted = args
        break
      case 'unshift':
        inserted = args
        break
      case 'splice':
        // 从索引2开始拷贝--splice的参数：startIndex, deleteCount, newValue... 所以从索引2开始复制
        inserted = args.slice(2)
        break
    }
    if (inserted) ob.observeArray(inserted)
    // notify change
    ob.dep.notify()
    return result
  })
})
