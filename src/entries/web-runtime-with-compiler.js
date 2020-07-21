/* @flow */

// Vue来源
import Vue from './web-runtime'
import { warn, cached } from 'core/util/index'
import { query } from 'web/util/index'
import { shouldDecodeTags, shouldDecodeNewlines } from 'web/util/compat'
import { compileToFunctions } from 'web/compiler/index'

// 创建一个缓存函数对象，可以对同一个ID的查询结果进行缓存
const idToTemplate = cached(id => {
  const el = query(id)
  return el && el.innerHTML
})

// 这里应该是缓存与平台无关的$mount方法，不过这种写法有点让人迷惑
const mount = Vue.prototype.$mount
// 每个平台定以不同的$mount以进行适配
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  // 使用原生JS查询，document.querySelector返回DOM
  el = el && query(el)

  /* istanbul ignore if */
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  // 获取用户传入的参数
  const options = this.$options
  // resolve template/el and convert to render function
  if (!options.render) {
    // render和template必定要有一个
    let template = options.template
    let isFromDOM = false
    if (template) {
      if (typeof template === 'string') {
        // 如果template以#号开头，表示该DOM是引用的
        if (template.charAt(0) === '#') {
          isFromDOM = true
          // 如果是ID的形式，在query Dom时使用document.getElementById是不是比较好
          template = idToTemplate(template)
        }
      } else if (template.nodeType) {
        isFromDOM = true
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      isFromDOM = true
      template = getOuterHTML(el)
    }
    if (template) {
      const { render, staticRenderFns } = compileToFunctions(template, {
        warn,
        isFromDOM,
        shouldDecodeTags,
        shouldDecodeNewlines,
        delimiters: options.delimiters
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns
    }
  }
  // 这一块并不是递归调用！！
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    // 为什么这里要深copy一下呢？？
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions

export default Vue
