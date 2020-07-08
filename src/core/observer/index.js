/* @flow */

import config from '../config'
import Dep from './dep'
// 从array中导入改造后的数组方法，用来监听数组的变化
import { arrayMethods } from './array'
import {
  def,
  isObject,
  isPlainObject,
  hasProto,
  hasOwn,
  warn
} from '../util/index'

// 获取对象上本身具有的属性
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * By default, when a reactive property is set, the new value is
 * also converted to become reactive. However when passing down props,
 * we don't want to force conversion because the value may be a nested value
 * under a frozen data structure. Converting it would defeat the optimization.
 */
export const observerState = {
  shouldConvert: true,
  isSettingProps: false
}

/**
 * Observer class that are attached to each observed
 * object. Once attached, the observer converts target
 * object's property keys into getter/setters that
 * collect dependencies and dispatches updates.
 */
export class Observer {
  // 被观察对象
  value: any;
  // 观察者
  dep: Dep;
  // 只有作为根才会有这个计数？？
  vmCount: number; // number of vms that has this object as root $data

  constructor (value: any) {
    // Observer上的value属性值为当前对象本身
    this.value = value
    // 每个Observer对象内含一个Dep对象
    this.dep = new Dep()
    this.vmCount = 0
    // lang.js中定义：(obj: Object, key: string, val: any, enumerable?: boolean)
    // value 是观察对象，这样写是不是命名上是不是不太清楚？？为什么要定义个__ob__属性，值为this呢？？
    // 这个this是VUE实例还是这个数组属性对象呢？？
    // this上有value, dep等属性
    // value为传入的对象，在传入的对象上定义一个__ob__属性，该属性值为该属性的Observer对象
    def(value, '__ob__', this)
    // 遍历对象，对对象的属性使用object.defineProperty定义setter和getter函数
    if (Array.isArray(value)) {
      // hasProto 测试{}上是否有__proto__属性
      const augment = hasProto
        ? protoAugment
        : copyAugment
      // 如果观察的对象时数组的话，将定义的数组方法赋值到对象上，或者定义到value的__proto__属性上（直接定义到__proto__上，是不是有覆盖的风险？？）
      augment(value, arrayMethods, arrayKeys)
      // 如果对象是数组，则递归进行数组内容进行观察
      this.observeArray(value)
    } else {
      this.walk(value)
    }
  }

  /**
   * Walk through each property and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    const keys = Object.keys(obj)
    // 对对象上的每一个属性进行遍历，定义响应式
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i], obj[keys[i]])
    }
  }

  /**
   * Observe a list of Array items.
   */
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment an target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  // 会不会有覆盖原型的风险
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment an target Object or Array by defining
 * hidden properties.
 *
 * istanbul ignore next
 */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any): Observer | void {
  // 只有是对象才会创建observe对象
  if (!isObject(value)) {
    return
  }
  let ob: Observer | void
  // __ob__属性上的值就是Observer对象
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    observerState.shouldConvert &&
    !config._isServer &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue // 对vue本身的过滤
  ) {
    ob = new Observer(value)
  }
  return ob
}

/**
 * Define a reactive property on an Object.
 */
// 定义对象上的某个属性的setter和getter函数
// 1. getter时候进行依赖收集
// 2. setter时候进行变化通知
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: Function
) {
  // 每个对象已经有一个dep了，这里为什么还会有dep呢？？
  const dep = new Dep()

  // Object.defineProperty中要用到的属性描述符
  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set

  // 当属性值时对象时，将该属性值包装成observe对象
  let childOb = observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        // 依赖收集 dependency
        // 父收集，子元素也进行收集？？对象有dep,属性也有自己的dep依赖收集
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
        }
        if (Array.isArray(value)) {
          // 只收集到数组中的值，不再往下进行递归收集了？？
          for (let e, i = 0, l = value.length; i < l; i++) {
            e = value[i]
            e && e.__ob__ && e.__ob__.dep.depend()
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      if (newVal === value) {
        return
      }
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        // 进行调试使用？？
        customSetter()
      }
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 每一次都重新观察新值的子属性
      childOb = observe(newVal)
      // 依赖通知
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
// 这里的set和this.$set作用是一样的吗？？
export function set (obj: Array<any> | Object, key: any, val: any) {
  if (Array.isArray(obj)) {
    // 删除一个元素，同时在该位置上添加一个元素val
    obj.splice(key, 1, val)
    return val
  }
  if (hasOwn(obj, key)) {
    obj[key] = val
    return
  }
  const ob = obj.__ob__
  // 1. 不允许在Vue实例本身上通过该函数设置响应式属性, 在Vue实例上定义可响应式属性需要通过传入的data选项进行定义
  // 2. 如果是一个可观察对象，但是可观察对象的vmCount > 0, 也会进行报错
  if (obj._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return
  }
  // __ob__属性是在new Observe中定义的，没有这个属性代表不是可观察对象
  if (!ob) {
    obj[key] = val
    // 这里直接就返回了？？为什么不用定义响应式呢
    // 在一个可观察对象上定义新的属性：如果不是Observe对象，这里也就不用定义响应式了
    return
  }
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (obj: Object, key: string) {
  const ob = obj.__ob__
  if (obj._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  if (!hasOwn(obj, key)) {
    return
  }
  delete obj[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}
