/* @flow */

import Watcher from '../observer/watcher'
import Dep from '../observer/dep'

import {
  set,
  del,
  observe,
  defineReactive,
  observerState
} from '../observer/index'

import {
  warn,
  hasOwn,
  isReserved,
  isPlainObject,
  bind,
  validateProp,
  noop
} from '../util/index'

export function initState (vm: Component) {
  vm._watchers = []
  initProps(vm)
  initData(vm)
  initComputed(vm)
  initMethods(vm)
  initWatch(vm)
}

function initProps (vm: Component) {
  const props = vm.$options.props
  if (props) {
    const propsData = vm.$options.propsData || {}
    const keys = vm.$options._propKeys = Object.keys(props)
    const isRoot = !vm.$parent
    // root instance props should be converted
    // 非根Vue则对props不进行转换
    observerState.shouldConvert = isRoot
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production') {
        // vm, key, val, customerSetter,开发环境时定义了customerSetter，在设置props的属性值时进行报错
        defineReactive(vm, key, validateProp(key, props, propsData, vm), () => {
          if (vm.$parent && !observerState.isSettingProps) {
            warn(
              `Avoid mutating a prop directly since the value will be ` +
              `overwritten whenever the parent component re-renders. ` +
              `Instead, use a data or computed property based on the prop's ` +
              `value. Prop being mutated: "${key}"`,
              vm
            )
          }
        })
      } else {
        defineReactive(vm, key, validateProp(key, props, propsData, vm))
      }
    }
    observerState.shouldConvert = true
  }
}

function initData (vm: Component) {
  let data = vm.$options.data
  // vm._data初始化为传入的data参数
  data = vm._data = typeof data === 'function'
    ? data.call(vm)
    : data || {}
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object.',
      vm
    )
  }
  // proxy data on instance
  const keys = Object.keys(data)
  const props = vm.$options.props
  let i = keys.length
  while (i--) {
    if (props && hasOwn(props, keys[i])) {
      // props属性优先，如果与data中字段冲突，则报错
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${keys[i]}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else {
      // 代理vm上的属性，实现在传入options中data里面的属性可以直接通过vm进行调用
      /**
       * vm = new Vue({
       *    data: {
       *        todo: XXX
       *    }
       * });
       * 可以直接通过vm.todo来调用
       */
      proxy(vm, keys[i])
    }
  }
  // observe data
  // 这里观察整个data对象？？--确实是这样
  // 这么做的原因是defineReactive需要在对象的属性上定义响应式
  /**
   * 传入的参数：
   * {
   *    data: {
   *      todo: XXX
   *    }
   * }
   * 这样就可以监听到data上todo属性的变化了，使用Object.defineProperty(data, "todo", {...})
   */
  observe(data)
  data.__ob__ && data.__ob__.vmCount++
}

// 计算属性无法直接赋值的设置
const computedSharedDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

function initComputed (vm: Component) {
  const computed = vm.$options.computed
  if (computed) {
    for (const key in computed) {
      // 计算属性的响应值
      const userDef = computed[key]
      if (typeof userDef === 'function') {
        computedSharedDefinition.get = makeComputedGetter(userDef, vm)
        computedSharedDefinition.set = noop
      } else {
        // 计算属性还可以是对象，其中get属性值是一个函数：{get:XXX, set:XXX, cache:true/false}
        computedSharedDefinition.get = userDef.get
          ? userDef.cache !== false
            ? makeComputedGetter(userDef.get, vm)
            : bind(userDef.get, vm) // 这里只是bind不创建watcher了？？
          : noop
        computedSharedDefinition.set = userDef.set
          ? bind(userDef.set, vm)
          : noop
      }
      // 在vm是定义计算属性，值为一个对象，对象中有get，set函数等
      Object.defineProperty(vm, key, computedSharedDefinition)
    }
  }
}

function makeComputedGetter (getter: Function, owner: Component): Function {
  // 计算属性的cb为空，但是getter为函数
  // 计算属性都是懒加载的，不会在new Watcher的时候出发依赖收集，也就是说如果计算属性没有被用到的话，就不会相应的dep
  const watcher = new Watcher(owner, getter, noop, {
    lazy: true
  })
  return function computedGetter () {
    // dirty属性值和lazy属性是一样，所以刚开始时会触发evaluate
    if (watcher.dirty) {
      // 主动调用watcher的get函数，进行依赖收集和属性值的计算
      // 在调用computed函数时，就会触发其所依赖的Observer的getter函数，然后就可以进行依赖收集
      watcher.evaluate()
    }
    if (Dep.target) {
      // 第一次调用computed属性时，会触发依赖收集，对于每一个被依赖的Observer都会进行收集，因此依赖的每一个Observer有所改变时都会触发computed的改变
      watcher.depend()
    }
    return watcher.value
  }
}

function initMethods (vm: Component) {
  const methods = vm.$options.methods
  if (methods) {
    for (const key in methods) {
      if (methods[key] != null) {
        // 定义的method都bind了当前的vm，可以直接使用this
        vm[key] = bind(methods[key], vm)
      } else if (process.env.NODE_ENV !== 'production') {
        warn(`Method "${key}" is undefined in options.`, vm)
      }
    }
  }
}

// watch如何观察状态的变更呢？{state: function(){}}
function initWatch (vm: Component) {
  const watch = vm.$options.watch
  if (watch) {
    // 参数里面定义的watch对象，其中每一个属性值都是函数
    for (const key in watch) {
      // 多个函数监听同一个状态
      const handler = watch[key]
      if (Array.isArray(handler)) {
        for (let i = 0; i < handler.length; i++) {
          createWatcher(vm, key, handler[i])
        }
      } else {
        createWatcher(vm, key, handler)
      }
    }
  }
}

// vm: Vue实例对象， key: 监听对象， Handler：回调函数（可以定义成对象）
function createWatcher (vm: Component, key: string, handler: any) {
  let options
  if (isPlainObject(handler)) {
    options = handler
    handler = handler.handler
  }
  // 定义成string，代表是Vue实例中的methods的函数
  if (typeof handler === 'string') {
    handler = vm[handler]
  }
  // 忽略掉该函数的返回值（取消观察）
  vm.$watch(key, handler, options)
}

// flow 和 Object.defineProperty有冲突？
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  const dataDef = {}
  dataDef.get = function () {
    return this._data
  }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData: Object) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
  }
  // 在Vue原型上定义$data属性
  Object.defineProperty(Vue.prototype, '$data', dataDef)

  Vue.prototype.$set = set
  Vue.prototype.$delete = del

  // 定义观察者,参数：
  // expOrFn: 观察的状态；cb: 回调函数；option：实例化时传入option中的观察属性对应的值
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ): Function {
    const vm: Component = this
    options = options || {}
    // 通过watch函数创建的，这里user属性为true，可能表示是用户定义的Watcher吧？？
    options.user = true
    // 只有调用get方法，才会触发依赖收集，这里似乎并没有进行这个操作？？
    const watcher = new Watcher(vm, expOrFn, cb, options)
    // 把watch的属性值定义成对象时，支持immediate属性，该属性定义是否立即调用还回调函数
    // 感觉这里调用应该和模板中的状态值有关系？？
    if (options.immediate) {
      // 回调函数的参数有点奇怪和watch里面的参数不一样
      cb.call(vm, watcher.value)
    }
    return function unwatchFn () {
      watcher.teardown()
    }
  }
}

// 代理，调用将options中的data转到_data属性中
function proxy (vm: Component, key: string) {
  if (!isReserved(key)) {
    Object.defineProperty(vm, key, {
      configurable: true,
      enumerable: true,
      get: function proxyGetter () {
        return vm._data[key]
      },
      set: function proxySetter (val) {
        vm._data[key] = val
      }
    })
  }
}
