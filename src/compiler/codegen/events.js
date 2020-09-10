/* @flow */

const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['.*?'\]|\[".*?"\]|\[\d+\]|\[[A-Za-z_$][\w$]*\])*$/

// keyCode aliases
// 按键和点击关联，这里对按键进行定义
const keyCodes = {
  esc: 27,
  tab: 9,
  enter: 13,
  space: 32,
  up: 38,
  left: 37,
  right: 39,
  down: 40,
  'delete': [8, 46]
}

// 对事件修饰符的封装
const modifierCode = {
  stop: '$event.stopPropagation();',
  prevent: '$event.preventDefault();',
  self: 'if($event.target !== $event.currentTarget)return;'
}

export function genHandlers (events: ASTElementHandlers, native?: boolean): string {
  let res = native ? 'nativeOn:{' : 'on:{'
  for (const name in events) {
    res += `"${name}":${genHandler(events[name])},`
  }
  return res.slice(0, -1) + '}'
}

function genHandler (
  handler: ASTElementHandler | Array<ASTElementHandler>
): string {
  if (!handler) {
    return 'function(){}'
  } else if (Array.isArray(handler)) {
    return `[${handler.map(genHandler).join(',')}]`
  } else if (!handler.modifiers) {
    // 事件监听中没有使用修饰符，判断是使用了函数还是直接写了表达式
    return simplePathRE.test(handler.value)
      ? handler.value
      : `function($event){${handler.value}}`
  } else {
    let code = ''
    const keys = []
    for (const key in handler.modifiers) {
      // 根据修饰符添加对应的代码
      if (modifierCode[key]) {
        code += modifierCode[key]
      } else {
        keys.push(key)
      }
    }
    if (keys.length) {
      // 如果不是目标按键则直接退出，不同执行后续操作
      code = genKeyFilter(keys) + code
    }
    // handler.value中是用户定义的事件响应执行体
    const handlerCode = simplePathRE.test(handler.value)
      ? handler.value + '($event)'
      : handler.value
    return 'function($event){' + code + handlerCode + '}'
  }
}

function genKeyFilter (keys: Array<string>): string {
  const code = keys.length === 1
    ? normalizeKeyCode(keys[0])
    : Array.prototype.concat.apply([], keys.map(normalizeKeyCode))
  if (Array.isArray(code)) {
    // 生成执行代码
    return `if(${code.map(c => `$event.keyCode!==${c}`).join('&&')})return;`
  } else {
    // 如果按键不是目标按键则直接退出，不用执行后续操作
    return `if($event.keyCode!==${code})return;`
  }
}

// 点击和按键关联
function normalizeKeyCode (key) {
  return (
    parseInt(key, 10) || // number keyCode
    keyCodes[key] || // built-in alias
    `_k(${JSON.stringify(key)})` // custom alias
  )
}
