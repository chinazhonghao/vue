/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'

let uid = 0

/**
 * A dep is an observable that can have multiple
 * directives subscribing to it.
 */
export default class Dep {
  static target: ?Watcher;
  id: number;
  // 观察某个状态的Watcher数组
  subs: Array<Watcher>;

  constructor () {
    // 单线程，可以这么搞
    this.id = uid++
    this.subs = []
  }

  // 为什么这里不直接把Dep.target加进来呢？反而是通过这种调用的方式
  // 是因为加入的时候有重复问题？？需要对加入的Dep进行过滤一下（使用Dep.id属性）
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // 检测Dep.target是否满足一系列的规则，然后将其添加到subs中
  // 是一个双向收集过程，在该dep中添加watcher,同时在watcher的deps中添加该dep
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }

  notify () {
    // stablize the subscriber list first
    const subs = this.subs.slice()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// the current target watcher being evaluated.
// this is globally unique because there could be only one
// watcher being evaluated at any time.
Dep.target = null
const targetStack = []

// 将上一个target入栈，然后将当前target指向新的Watcher对象
export function pushTarget (_target: Watcher) {
  if (Dep.target) targetStack.push(Dep.target)
  Dep.target = _target
}

// 还原上一次的Watcher对象
export function popTarget () {
  Dep.target = targetStack.pop()
}
