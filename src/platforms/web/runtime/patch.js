/* @flow */

import * as nodeOps from 'web/runtime/node-ops'
import { createPatchFunction } from 'core/vdom/patch'
// 含有ref和directives的生命周期更新函数
import baseModules from 'core/vdom/modules/index'
// 含有attrs, class, props, events, style, transition生命周期函数
// 这个modules的后缀命名不太恰当，无法反应实际意义
import platformModules from 'web/runtime/modules/index'

// the directive module should be applied last, after all
// built-in modules have been applied.
const modules = platformModules.concat(baseModules)

// 根据平台特性传入参数创建path函数
export const patch: Function = createPatchFunction({ nodeOps, modules })
