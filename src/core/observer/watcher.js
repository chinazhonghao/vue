/* @flow */

import config from '../config'
import Dep, { pushTarget, popTarget } from './dep'
import { queueWatcher } from './scheduler'
import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set
} from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
export default class Watcher {
  vm: Component;
  expression: string; // 被观察的状态
  cb: Function;
  id: number;
  deep: boolean;
  user: boolean;
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  depIds: Set;
  newDepIds: Set;
  getter: Function;
  value: any;

  // 构造函数要传入vm对象，Vue实例
  // 参数：vm: Vue实例；expOrFn: 观察状态（vm中的状态）；cb: 回调函数； options: 定义观察对象的回调函数时，支持对象的形式
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: Object = {}
  ) {
    this.vm = vm
    // 将所有的watcher都放到vm的_watchers数组中？？
    vm._watchers.push(this)
    // options
    this.deep = !!options.deep
    this.user = !!options.user
    this.lazy = !!options.lazy
    this.sync = !!options.sync
    this.expression = expOrFn.toString()
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers
    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    // 这里有点奇怪，为什么要设置getter呢？还搞成个function
    // parse expression for getter
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }
    // 这里的value是什么？？，为什么要传入一个getter函数
    // lazy：使用时才会获取值，然后触发依赖收集？？
    this.value = this.lazy
      ? undefined
      : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  // 为什么要重新收集dependency呢？？
  get () {
    // 设置Dep.target为当前对象（Watcher）
    pushTarget(this)
    // 调用getter函数，就可以触发使用Object.defineProperty定义的getter属性
    // 计算属性getter为定义的函数，给定义的函数传入vm参数，是为了防止函数本身被bind了this
    const value = this.getter.call(this.vm, this.vm)
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    // 传入deep参数
    if (this.deep) {
      // 这个遍历并没有改变什么，不知道有什么用意？？--通过遍历属性就可以触发依赖收集了
      // 深度遍历的时候的Watcher都是当前Watcher
      traverse(value)
    }
    popTarget()
    this.cleanupDeps()
    return value
  }

  /**
   * Add a dependency to this directive.
   */
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  // 为什么要进行清除呢？？
  cleanupDeps () {
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      // 经过这次收集之后，将旧的dep删掉，怎么保证没有删错呢
      if (!this.newDepIds.has(dep.id)) {
        // 只是dep删掉了，对应的id并没有被删除？？--这块感觉是有bug的，会导致第二次depIds中存在id，无法再次添加进来
        dep.removeSub(this)
      }
    }
    // 交换一下，意义在哪里呢？？--新旧交换
    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()
    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
  update () {
    /* istanbul ignore else */
    // 计算属性的这个属性为true，通过设置dirty属性控制在获取计算属性时主动触发get函数
    if (this.lazy) {
      this.dirty = true
    } else if (this.sync) {
      this.run()
    } else {
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
  run () {
    if (this.active) {
      // 再次触发依赖收集？？，由于有dep所以不会重复收集依赖
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        this.value = value
        if (this.user) {
          // watcher里面的回调函数调用方式
          try {
            // 调用函数设置this指向，和watcher参数一致
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            process.env.NODE_ENV !== 'production' && warn(
              `Error in watcher "${this.expression}"`,
              this.vm
            )
            /* istanbul ignore else */
            if (config.errorHandler) {
              config.errorHandler.call(null, e, this.vm)
            } else {
              throw e
            }
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
  evaluate () {
    // 当前的value值
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subcriber list.
   */
  teardown () {
    // 移除观察者
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed or is performing a v-for
      // re-render (the watcher list is then filtered by v-for).
      if (!this.vm._isBeingDestroyed && !this.vm._vForRemoving) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
// 通过Set避免重复调用函数时的重复触发收集
const seenObjects = new Set()
function traverse (val: any, seen?: Set) {
  let i, keys
  if (!seen) {
    seen = seenObjects
    seen.clear()
  }
  const isA = Array.isArray(val)
  const isO = isObject(val)
  if ((isA || isO) && Object.isExtensible(val)) {
    if (val.__ob__) {
      const depId = val.__ob__.dep.id
      // 通过set收集遍历过的dep.id，避免重复
      if (seen.has(depId)) {
        return
      } else {
        seen.add(depId)
      }
    }
    // 根据对象是数组或者是对象，进行递归调用，对其中的每个元素进行观察
    // ！！通过属性调用就可以触发Object.defineProperty定义的getter方法，然后就可以触发依赖收集了
    if (isA) {
      i = val.length
      while (i--) traverse(val[i], seen)
    } else if (isO) {
      keys = Object.keys(val)
      i = keys.length
      while (i--) traverse(val[keys[i]], seen)
    }
  }
}
