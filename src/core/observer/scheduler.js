/* @flow */

import type Watcher from './watcher'
import config from '../config'
import {
  warn,
  nextTick,
  devtools
} from '../util/index'

const queue: Array<Watcher> = []
let has: { [key: number]: ?true } = {}
let circular: { [key: number]: number } = {}
let waiting = false
let flushing = false
let index = 0

/**
 * Reset the scheduler's state.
 */
function resetSchedulerState () {
  queue.length = 0
  has = {}
  if (process.env.NODE_ENV !== 'production') {
    circular = {}
  }
  waiting = flushing = false
}

/**
 * Flush both queues and run the watchers.
 */
function flushSchedulerQueue () {
  flushing = true

  // Sort queue before flush.
  // This ensures that:
  // 1. Components are updated from parent to child. (because parent is always
  //    created before the child)
  // 2. A component's user watchers are run before its render watcher (because
  //    user watchers are created before the render watcher)
  // 3. If a component is destroyed during a parent component's watcher run,
  //    its watchers can be skipped.
  // watcher的id是有一定规律的， parent->child, user watcher -> render watcher
  queue.sort((a, b) => a.id - b.id)

  // do not cache length because more watchers might be pushed
  // as we run existing watchers
  // 通过queueWatcher添加更多watcher
  for (index = 0; index < queue.length; index++) {
    const watcher = queue[index]
    const id = watcher.id
    // 把watcher取出来之后，标志位清空
    has[id] = null
    watcher.run()
    // in dev build, check and stop circular updates.
    if (process.env.NODE_ENV !== 'production' && has[id] != null) {
      // 观察者的循环检测
      circular[id] = (circular[id] || 0) + 1
      if (circular[id] > config._maxUpdateCount) {
        warn(
          'You may have an infinite update loop ' + (
            watcher.user
              ? `in watcher with expression "${watcher.expression}"`
              : `in a component render function.`
          ),
          watcher.vm
        )
        break
      }
    }
  }

  // devtool hook
  /* istanbul ignore if */
  if (devtools && config.devtools) {
    devtools.emit('flush')
  }

  resetSchedulerState()
}

/**
 * Push a watcher into the watcher queue.
 * Jobs with duplicate IDs will be skipped unless it's
 * pushed when the queue is being flushed.
 */
export function queueWatcher (watcher: Watcher) {
  const id = watcher.id
  // 通过watcher的ID避免在queue中添加重复的watcher
  if (has[id] == null) {
    has[id] = true
    // 通过判断flushing标识判断queue的当前状态
    if (!flushing) {
      queue.push(watcher)
    } else {
      // if already flushing, splice the watcher based on its id
      // if already past its id, it will be run next immediately.
      // 找到第一个比待添加watcher小的watcher，插入排序的方式
      let i = queue.length - 1
      while (i >= 0 && queue[i].id > watcher.id) {
        i--
      }
      // start, deletedCount(0：不删除元素)，watcher要添加进数组的元素从start位置开始
      // 插入的位置在index之后
      queue.splice(Math.max(i, index) + 1, 0, watcher)
    }
    // queue the flush
    // 添加watcher之后，自动会在nextTick中执行
    if (!waiting) {
      waiting = true
      nextTick(flushSchedulerQueue)
    }
  }
}
