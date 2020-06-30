/* @flow */

import { isPrimitive, warn } from '../util/index'
import VNode from './vnode'

export function normalizeChildren (
  children: any,
  ns: string | void,
  nestedIndex: number | void
): Array<VNode> | void {
  if (isPrimitive(children)) {
    return [createTextVNode(children)]
  }
  if (Array.isArray(children)) {
    const res = []
    for (let i = 0, l = children.length; i < l; i++) {
      const c = children[i]
      const last = res[res.length - 1]
      //  nested
      if (Array.isArray(c)) {
        res.push.apply(res, normalizeChildren(c, ns, i))
      } else if (isPrimitive(c)) {
        if (last && last.text) {
          last.text += String(c)
        } else if (c !== '') {
          // convert primitive to vnode
          res.push(createTextVNode(c))
        }
      } else if (c instanceof VNode) {
        if (c.text && last && last.text) {
          last.text += c.text
        } else {
          // inherit parent namespace
          if (ns) {
            applyNS(c, ns)
          }
          // default key for nested array children (likely generated by v-for)
          if (c.tag && c.key == null && nestedIndex != null) {
            c.key = `__vlist_${nestedIndex}_${i}__`
          }
          res.push(c)
        }
      }
    }
    return res
  }
}

function createTextVNode (val) {
  return new VNode(undefined, undefined, undefined, String(val))
}

function applyNS (vnode, ns) {
  if (vnode.tag && !vnode.ns) {
    vnode.ns = ns
    if (vnode.children) {
      for (let i = 0, l = vnode.children.length; i < l; i++) {
        applyNS(vnode.children[i], ns)
      }
    }
  }
}

export function getFirstComponentChild (children: ?Array<any>) {
  return children && children.filter(c => c && c.componentOptions)[0]
}

export function mergeVNodeHook (def: Object, key: string, hook: Function) {
  const oldHook = def[key]
  if (oldHook) {
    const injectedHash = def.__injected || (def.__injected = {})
    if (!injectedHash[key]) {
      injectedHash[key] = true
      def[key] = function () {
        oldHook.apply(this, arguments)
        hook.apply(this, arguments)
      }
    }
  } else {
    def[key] = hook
  }
}

// 作为一个基础方法，对于DOM事件有updateDOMListeners这个函数
export function updateListeners (
  on: Object,
  oldOn: Object,
  add: Function,
  remove: Function
) {
  let name, cur, old, fn, event, capture
  for (name in on) {
    cur = on[name]
    old = oldOn[name]
    if (!cur) {
      // 通过这种方式来关闭生产环境下的调试信息
      process.env.NODE_ENV !== 'production' && warn(
        `Handler for event "${name}" is undefined.`
      )
    } else if (!old) {
      // 捕获阶段
      capture = name.charAt(0) === '!'
      event = capture ? name.slice(1) : name
      if (Array.isArray(cur)) {
        // $on并不接受三个参数，这点有点奇怪啊???
        // 回调函数是一个数组，通过arrInvoker生成一个函数进行调用
        // 这里其实可以设置回调函数返回一个值，在链式处理回调函数的时候可以终止
        add(event, (cur.invoker = arrInvoker(cur)), capture)
      } else {
        if (!cur.invoker) {
          fn = cur
          cur = on[name] = {}
          cur.fn = fn
          cur.invoker = fnInvoker(cur)
        }
        add(event, cur.invoker, capture)
      }
    } else if (cur !== old) {
      if (Array.isArray(old)) {
        old.length = cur.length
        for (let i = 0; i < old.length; i++) old[i] = cur[i]
        on[name] = old
      } else {
        old.fn = cur
        on[name] = old
      }
    }
  }
  // 从old回调函数中移除响应的事件监听队列
  for (name in oldOn) {
    if (!on[name]) {
      event = name.charAt(0) === '!' ? name.slice(1) : name
      remove(event, oldOn[name].invoker)
    }
  }
}

// 数组里面的对象是函数，然后遍历调用
function arrInvoker (arr: Array<Function>): Function {
  return function (ev) {
    const single = arguments.length === 1
    for (let i = 0; i < arr.length; i++) {
      // 这里调用不设置this值
      single ? arr[i](ev) : arr[i].apply(null, arguments)
    }
  }
}

// 数组函数调用可以理解，这里单个函数为什么这么搞呢
function fnInvoker (o: { fn: Function }): Function {
  return function (ev) {
    const single = arguments.length === 1
    single ? o.fn(ev) : o.fn.apply(null, arguments)
  }
}
