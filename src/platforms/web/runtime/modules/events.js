// skip type checking this file because we need to attach private properties
// to elements

import { updateListeners } from 'core/vdom/helpers'

// DOM上的事件存储在DOM本身上，这个与jQuery处理是相同的
function updateDOMListeners (oldVnode, vnode) {
  if (!oldVnode.data.on && !vnode.data.on) {
    return
  }
  // DOM事件存储在data.on，每个DOM上的监听事件，例如v-click, 
  // directives也存储在vnode的data上， 每个DOM上的指令，例如v-show这种
  const on = vnode.data.on || {}
  const oldOn = oldVnode.data.on || {}
  const add = vnode.elm._v_add || (vnode.elm._v_add = (event, handler, capture) => {
    // 调用原生的事件绑定方法
    vnode.elm.addEventListener(event, handler, capture)
  })
  const remove = vnode.elm._v_remove || (vnode.elm._v_remove = (event, handler) => {
    vnode.elm.removeEventListener(event, handler)
  })
  updateListeners(on, oldOn, add, remove)
}

export default {
  create: updateDOMListeners,
  update: updateDOMListeners
}
