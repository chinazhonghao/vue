/* @flow */

import {
  getBindingAttr
} from 'compiler/helpers'
// style的处理方式和class的处理方式不相同，为啥要这样呢
function transformNode (el: ASTElement) {
  const styleBinding = getBindingAttr(el, 'style', false /* getStatic */)
  if (styleBinding) {
    el.styleBinding = styleBinding
  }
}

function genData (el: ASTElement): string {
  return el.styleBinding
    ? `style:(${el.styleBinding}),`
    : ''
}

export default {
  transformNode,
  genData
}
