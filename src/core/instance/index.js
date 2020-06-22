import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'

/**
 * 通过new运算符进行调用，new Vue()的形式，返回ele, 则ele.__proto__ === Vue.prototype
 * instanceof运算符检测对象是否是某个构造函数的实例，即检测上述的等号是否存在
 * @param {*} options 
 */
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 这里的this是何时被赋予Component对象类型的？？
  this._init(options)
}

initMixin(Vue)
stateMixin(Vue)
eventsMixin(Vue)
lifecycleMixin(Vue)
renderMixin(Vue)

export default Vue
