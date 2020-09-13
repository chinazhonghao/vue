/* @flow */

import Vue from '../instance/index'
import config from '../config'
import { warn } from './debug'
import { set } from '../observer/index'
import {
  extend,
  isObject,
  isPlainObject,
  hasOwn,
  camelize,
  capitalize,
  isBuiltInTag
} from 'shared/util'

/**
 * Option overwriting strategies are functions that handle
 * how to merge a parent option value and a child option
 * value into the final value.
 */
// 可以覆盖这个配置来自定义合并策略
const strats = config.optionMergeStrategies

/**
 * Options with restrictions
 */
if (process.env.NODE_ENV !== 'production') {
  strats.el = strats.propsData = function (parent, child, vm, key) {
    if (!vm) {
      warn(
        `option "${key}" can only be used during instance ` +
        'creation with the `new` keyword.'
      )
    }
    return defaultStrat(parent, child)
  }

  strats.name = function (parent, child, vm) {
    if (vm && child) {
      warn(
        'options "name" can only be used as a component definition option, ' +
        'not during instance creation.'
      )
    }
    return defaultStrat(parent, child)
  }
}

/**
 * Helper that recursively merges two data objects together.
 */
function mergeData (to: Object, from: ?Object): Object {
  let key, toVal, fromVal
  for (key in from) {
    toVal = to[key]
    fromVal = from[key]
    if (!hasOwn(to, key)) {
      // 如果key不是to上的原生属性，则用from上的属性值进行覆盖，并没有判断from上是否是原生属性
      // 同时定义响应式
      set(to, key, fromVal)
    } else if (isObject(toVal) && isObject(fromVal)) {
      // 如果两个都是对象，则进行深度合并
      // 如果其中有一个不是对象，就无法进行合并了？？--》如果key是to上的原生属性，则以to上的原生属性为主
      mergeData(toVal, fromVal)
    }
  }
  return to
}

/**
 * Data
 */
strats.data = function (
  parentVal: any,
  childVal: any,
  vm?: Component
): ?Function {
  if (!vm) {
    // in a Vue.extend merge, both should be functions
    if (!childVal) {
      return parentVal
    }
    if (typeof childVal !== 'function') {
      process.env.NODE_ENV !== 'production' && warn(
        'The "data" option should be a function ' +
        'that returns a per-instance value in component ' +
        'definitions.',
        vm
      )
      return parentVal
    }
    if (!parentVal) {
      return childVal
    }
    // when parentVal & childVal are both present,
    // we need to return a function that returns the
    // merged result of both functions... no need to
    // check if parentVal is a function here because
    // it has to be a function to pass previous merges.
    // 当vm不存在时，定义的是一个函数，这个也和Component是一致的，Component中的data属性定义为function
    return function mergedDataFn () {
      return mergeData(
        childVal.call(this),
        parentVal.call(this)
      )
    }
  } else if (parentVal || childVal) {
    return function mergedInstanceDataFn () {
      // instance merge
      const instanceData = typeof childVal === 'function'
        ? childVal.call(vm)
        : childVal
        // 这个undefined是不是写错了，parentVal不是函数时就直接设置为undefined了？？
      const defaultData = typeof parentVal === 'function'
        ? parentVal.call(vm)
        : undefined
      if (instanceData) {
        return mergeData(instanceData, defaultData)
      } else {
        return defaultData
      }
    }
  }
}

/**
 * Hooks and param attributes are merged as arrays.
 */
// 生命周期函数合并成数组，这样话多个之间有个执行顺序
// 主要是适用于mixins,同名钩子函数将合并为一个数组，混入对象的钩子将在组件自身钩子之前调用
function mergeHook (
  parentVal: ?Array<Function>,
  childVal: ?Function | ?Array<Function>
): ?Array<Function> {
  return childVal
    ? parentVal
      ? parentVal.concat(childVal) // 这个链接明显是parentVal在childVal之前，如何保证混入对象的钩子在组件自身钩子之前调用呢？？
      : Array.isArray(childVal)
        ? childVal
        : [childVal]
    : parentVal
}

// 生命周期函数的合并策略
// beforeCreate, created
// beforeMount, mounted
// beforeUpdate, updated
// beforeDestroy, detroyed
// activited, deactivited
config._lifecycleHooks.forEach(hook => {
  strats[hook] = mergeHook
})

/**
 * Assets
 *
 * When a vm is present (instance creation), we need to do
 * a three-way merge between constructor options, instance
 * options and parent options.
 */
// extend简单的浅拷贝，以parent为原型，将child设置为当前对象，将childVal上的属性和值浅拷贝到当前对象上
function mergeAssets (parentVal: ?Object, childVal: ?Object): Object {
  const res = Object.create(parentVal || null)
  return childVal
    ? extend(res, childVal)
    : res
}

/**
 * 对这三种属性进行合并的方式
 * 'component',
 * 'directive'
 * 'filter'
 */
config._assetTypes.forEach(function (type) {
  strats[type + 's'] = mergeAssets
})

/**
 * Watchers.
 *
 * Watchers hashes should not overwrite one
 * another, so we merge them as arrays.
 */
strats.watch = function (parentVal: ?Object, childVal: ?Object): ?Object {
  /* istanbul ignore if */
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  const ret = {}
  extend(ret, parentVal)
  // 这里合并方法和mergeHook重复了
  // 对同一个属性的监听，合并成一个数组
  for (const key in childVal) {
    let parent = ret[key]
    const child = childVal[key]
    if (parent && !Array.isArray(parent)) {
      parent = [parent]
    }
    ret[key] = parent
      ? parent.concat(child)
      : [child]
  }
  return ret
}

/**
 * Other object hashes.
 * props, methods, computed的合并策略是一样的，直接用child上的属性覆盖parent上对应属性
 */
strats.props =
strats.methods =
// 计算属性的合并，进行覆盖了
strats.computed = function (parentVal: ?Object, childVal: ?Object): ?Object {
  if (!childVal) return parentVal
  if (!parentVal) return childVal
  const ret = Object.create(null)
  extend(ret, parentVal)
  extend(ret, childVal)
  return ret
}

/**
 * Default strategy.
 */
// 默认的合并策略，child为空则用parent上的数据，否则用child上的数据
const defaultStrat = function (parentVal: any, childVal: any): any {
  return childVal === undefined
    ? parentVal
    : childVal
}

/**
 * Make sure component options get converted to actual
 * constructors.
 */
// 包装传入的选项，使之成为一个VueComponent
function normalizeComponents (options: Object) {
  // 传入的选项中有组件选项
  if (options.components) {
    const components = options.components
    let def
    for (const key in components) {
      const lower = key.toLowerCase()
      // 不能用原生的Tag和保留Tag
      if (isBuiltInTag(lower) || config.isReservedTag(lower)) {
        process.env.NODE_ENV !== 'production' && warn(
          'Do not use built-in or reserved HTML elements as component ' +
          'id: ' + key
        )
        continue
      }
      def = components[key]
      if (isPlainObject(def)) {
        // 确保def不是null或者数组，使用Vue.extend,将组件定义定义成Vue子对象
        // 这里对应的是一个构造函数，应该在实例化过程中会调用这个函数
        components[key] = Vue.extend(def)
      }
    }
  }
}

/**
 * Ensure all props option syntax are normalized into the
 * Object-based format.
 */
/**
 * 转换props的属性名称，格式化属性值为{}形式
 */
function normalizeProps (options: Object) {
  const props = options.props
  if (!props) return
  const res = {}
  let i, val, name
  // props以数组方式进行传递，保证数组中的每一项都是string类型
  if (Array.isArray(props)) {
    i = props.length
    while (i--) {
      val = props[i]
      if (typeof val === 'string') {
        name = camelize(val)
        // 数组方式传递的props无法确定参数类型
        res[name] = { type: null }
      } else if (process.env.NODE_ENV !== 'production') {
        warn('props must be strings when using array syntax.')
      }
    }
  } else if (isPlainObject(props)) {
    for (const key in props) {
      val = props[key]
      // 将props的名称进行转换
      name = camelize(key)
      // props的类型
      res[name] = isPlainObject(val)
        ? val
        : { type: val }
    }
  }
  options.props = res
}

/**
 * Normalize raw function directives into object format.
 */
// 格式化指令，使指令的值对应对象形式，对象中有hook函数
function normalizeDirectives (options: Object) {
  const dirs = options.directives
  if (dirs) {
    for (const key in dirs) {
      const def = dirs[key]
      if (typeof def === 'function') {
        // 指定的两个属性：bind和update都是绑定到同一个函数
        dirs[key] = { bind: def, update: def }
      }
    }
  }
}

/**
 * Merge two option objects into a new one.
 * Core utility used in both instantiation and inheritance.
 */
// child是输入的参数对象
export function mergeOptions (
  parent: Object,
  child: Object,
  vm?: Component
): Object {
  normalizeComponents(child)
  normalizeProps(child)
  normalizeDirectives(child)
  const extendsFrom = child.extends
  if (extendsFrom) {
    parent = typeof extendsFrom === 'function'
      ? mergeOptions(parent, extendsFrom.options, vm)
      : mergeOptions(parent, extendsFrom, vm)
  }
  // mixins的混合, 混合方式：先混合mixins属性上的内容，再混合options上的内容，因此调用时也会先调用mixins上的钩子函数
  if (child.mixins) {
    for (let i = 0, l = child.mixins.length; i < l; i++) {
      // child.mixins中是输入选项中的mixin内容（用户定义部分）
      let mixin = child.mixins[i]
      if (mixin.prototype instanceof Vue) {
        // 也可以从一个Vue对象上进行合并
        mixin = mixin.options
      }
      // 由于mixin的与输入的options结构相同，因此这里采用递归方式进行合并
      parent = mergeOptions(parent, mixin, vm)
    }
  }
  const options = {}
  let key
  for (key in parent) {
    mergeField(key)
  }
  for (key in child) {
    // 如果parent上有这个key了，在上面的合并中就已经处理了
    if (!hasOwn(parent, key)) {
      mergeField(key)
    }
  }
  function mergeField (key) {
    // 对于每一中属性有不同的合并策略，这里获取对于当前key的合并策略
    const strat = strats[key] || defaultStrat
    options[key] = strat(parent[key], child[key], vm, key)
  }
  return options
}

/**
 * Resolve an asset.
 * This function is used because child instances need access
 * to assets defined in its ancestor chain.
 */
export function resolveAsset (
  options: Object,
  type: string,
  id: string,
  warnMissing?: boolean
): any {
  /* istanbul ignore if */
  if (typeof id !== 'string') {
    return
  }
  // components，directives，filters
  // 注意上述这三种属性的合并方式，这里查找会从原型链上查找
  const assets = options[type]
  const res = assets[id] ||
    // camelCase ID
    assets[camelize(id)] ||
    // Pascal Case ID
    assets[capitalize(camelize(id))]
  if (process.env.NODE_ENV !== 'production' && warnMissing && !res) {
    warn(
      'Failed to resolve ' + type.slice(0, -1) + ': ' + id,
      options
    )
  }
  return res
}
