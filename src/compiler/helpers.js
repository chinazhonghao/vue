/* @flow */
// 通过控制台进行错误展示
export function baseWarn (msg: string) {
  console.error(`[Vue parser]: ${msg}`)
}

export function pluckModuleFunction (
  modules: ?Array<Object>,
  key: string
): Array<Function> {
  return modules
    ? modules.map(m => m[key]).filter(_ => _)
    : []
}

// 添加prop
export function addProp (el: ASTElement, name: string, value: string) {
  (el.props || (el.props = [])).push({ name, value })
}

// 添加attr
export function addAttr (el: ASTElement, name: string, value: string) {
  (el.attrs || (el.attrs = [])).push({ name, value })
}

export function addDirective (
  el: ASTElement,
  name: string,
  value: string,
  arg: ?string,
  modifiers: ?{ [key: string]: true }
) {
  (el.directives || (el.directives = [])).push({ name, value, arg, modifiers })
}

export function addHandler (
  el: ASTElement,
  name: string,
  value: string,
  modifiers: ?{ [key: string]: true },
  important: ?boolean
) {
  // check capture modifier
  if (modifiers && modifiers.capture) {
    // 这里为什么把这个属性删除掉呢
    delete modifiers.capture
    name = '!' + name // mark the event as captured
  }
  let events
  // 区分事件类型：native 和 非native
  if (modifiers && modifiers.native) {
    delete modifiers.native
    events = el.nativeEvents || (el.nativeEvents = {})
  } else {
    events = el.events || (el.events = {})
  }
  const newHandler = { value, modifiers }
  // 保存原先的事件函数
  const handlers = events[name]
  /* istanbul ignore if */
  // 这里处理的复杂了，直接初始化成空数组就可以了
  if (Array.isArray(handlers)) {
    // important属性为true，则将回调函数放在回调队列的最前面，否则放在最后面
    important ? handlers.unshift(newHandler) : handlers.push(newHandler)
  } else if (handlers) {
    events[name] = important ? [newHandler, handlers] : [handlers, newHandler]
  } else {
    events[name] = newHandler
  }
}

export function getBindingAttr (
  el: ASTElement,
  name: string,
  getStatic?: boolean
): ?string {
  const dynamicValue =
    getAndRemoveAttr(el, ':' + name) ||
    getAndRemoveAttr(el, 'v-bind:' + name)
  if (dynamicValue != null) {
    return dynamicValue
  } else if (getStatic !== false) {
    const staticValue = getAndRemoveAttr(el, name)
    if (staticValue != null) {
      return JSON.stringify(staticValue)
    }
  }
}

export function getAndRemoveAttr (el: ASTElement, name: string): ?string {
  let val
  // attraMap中存放的是attr的name和value
  if ((val = el.attrsMap[name]) != null) {
    // 只是从attrsList中删除掉该值
    const list = el.attrsList
    for (let i = 0, l = list.length; i < l; i++) {
      if (list[i].name === name) {
        // 移除该值
        list.splice(i, 1)
        break
      }
    }
  }
  return val
}
