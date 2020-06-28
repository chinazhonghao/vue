/* not type checking this file because flow doesn't play well with Proxy */

import { warn, makeMap } from '../util/index'

let hasProxy, proxyHandlers, initProxy

// 这样的话，能少占用点内存？？
if (process.env.NODE_ENV !== 'production') {
  const allowedGlobals = makeMap(
    'Infinity,undefined,NaN,isFinite,isNaN,' +
    'parseFloat,parseInt,decodeURI,decodeURIComponent,encodeURI,encodeURIComponent,' +
    'Math,Number,Date,Array,Object,Boolean,String,RegExp,Map,Set,JSON,Intl,' +
    'require' // for Webpack/Browserify
  )

  // 执行之后：["native code", index: 20, input: "function Proxy() { [native code] }", groups: undefined]
  hasProxy =
    typeof Proxy !== 'undefined' &&
    Proxy.toString().match(/native code/)

  proxyHandlers = {
    // 这里要代理has操作，in操作符的捕捉器，为什么要这么做呢？？
    // 在开发环境中进行代理，可以检测在render过程中使用关键字的情况
    // 这里其实有点bug,报错提示不明显，以_开头的自定义变量会返回false，导致浏览器报错【Uncaught ReferenceError: _test is not defined】
    has (target, key) {
      const has = key in target
      // key不在target中，has为false
      // allowedGlobals允许的关键字，或者以"_"开始的关键字
      const isAllowed = allowedGlobals(key) || key.charAt(0) === '_'
      // key在target上，或者可以是上面定义的符号
      // has为false并且isAllowed为false，会抛异常，（如果key不在target上，且不是被允许的属性，抛异常，这一块有点绕啊）
      if (!has && !isAllowed) {
        warn(
          `Property or method "${key}" is not defined on the instance but ` +
          `referenced during render. Make sure to declare reactive data ` +
          `properties in the data option.`,
          target
        )
      }
      // has为true，或者isAllowed为false，返回true
      // key在target上，且不是关键字才会返回true
      return has || !isAllowed
    }
  }

  initProxy = function initProxy (vm) {
    if (hasProxy) {
      vm._renderProxy = new Proxy(vm, proxyHandlers)
    } else {
      vm._renderProxy = vm
    }
  }
}

export { initProxy }
