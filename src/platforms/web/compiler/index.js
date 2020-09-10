/* @flow */

import { extend, genStaticKeys, noop } from 'shared/util'
import { isIE } from 'core/util/env'
import { warn } from 'core/util/debug'
import { compile as baseCompile } from 'compiler/index'
import { detectErrors } from 'compiler/error-detector'
import modules from './modules/index'
import directives from './directives/index'
import {
  isReservedTag, isUnaryTag,
  mustUseProp, getTagNamespace, isPreTag
} from '../util/index'

const cache: { [key: string]: CompiledFunctionResult } = Object.create(null)

export const baseOptions: CompilerOptions = {
  isIE,
  // 编译输出结果
  expectHTML: true,
  modules,
  staticKeys: genStaticKeys(modules),
  directives,
  isReservedTag,
  isUnaryTag,
  mustUseProp,
  getTagNamespace,
  isPreTag
}

// 传入模版和选项，扩展了基础选项后进行编译
export function compile (
  template: string,
  options?: CompilerOptions
): CompiledResult {
  options = options
    ? extend(extend({}, baseOptions), options)
    : baseOptions
  return baseCompile(template, options)
}

/**
 * 将template编译成render函数
 */
export function compileToFunctions (
  template: string,
  options?: CompilerOptions,
  vm?: Component
): CompiledFunctionResult {
  const _warn = (options && options.warn) || warn
  // detect possible CSP restriction
  /* istanbul ignore if */
  if (process.env.NODE_ENV !== 'production') {
    try {
      new Function('return 1')
    } catch (e) {
      if (e.toString().match(/unsafe-eval|CSP/)) {
        _warn(
          'It seems you are using the standalone build of Vue.js in an ' +
          'environment with Content Security Policy that prohibits unsafe-eval. ' +
          'The template compiler cannot work in this environment. Consider ' +
          'relaxing the policy to allow unsafe-eval or pre-compiling your ' +
          'templates into render functions.'
        )
      }
    }
  }
  const key = options && options.delimiters
    ? String(options.delimiters) + template
    : template
  if (cache[key]) {
    return cache[key]
  }
  const res = {}
  const compiled = compile(template, options)
  res.render = makeFunction(compiled.render)
  const l = compiled.staticRenderFns.length
  res.staticRenderFns = new Array(l)
  for (let i = 0; i < l; i++) {
    // 没太明白staticRender有啥用？？
    res.staticRenderFns[i] = makeFunction(compiled.staticRenderFns[i])
  }
  if (process.env.NODE_ENV !== 'production') {
    if (res.render === noop || res.staticRenderFns.some(fn => fn === noop)) {
      _warn(
        `failed to compile template:\n\n${template}\n\n` +
        detectErrors(compiled.ast).join('\n') +
        '\n\n',
        vm
      )
    }
  }
  return (cache[key] = res)
}

function makeFunction (code) {
  try {
    return new Function(code)
  } catch (e) {
    return noop
  }
}

// res.render 样例，根据todo.html而来
/**
 * (function anonymous() {
    with (this) {
        return _h('section', {
            staticClass: "todoapp"
        }, [_h('header', {
            staticClass: "header"
        }, [_m(0), " ", _h('input', {
            directives: [{
                name: "model",
                value: (newTodo),
                expression: "newTodo"
            }],
            staticClass: "new-todo",
            attrs: {
                "autofocus": "",
                "autocomplete": "off",
                "placeholder": "What needs to be done?"
            },
            domProps: {
                "value": _s(newTodo)
            },
            on: {
                "keyup": function($event) {
                    if ($event.keyCode !== 13)
                        return;
                    addTodo($event)
                },
                "input": function($event) {
                    if ($event.target.composing)
                        return;
                    newTodo = $event.target.value
                }
            }
        })]), " ", _h('section', {
            directives: [{
                name: "show",
                value: (todos.length),
                expression: "todos.length"
            }],
            staticClass: "main"
        }, [_h('input', {
            staticClass: "toggle-all",
            attrs: {
                "type": "checkbox"
            },
            domProps: {
                "checked": Array.isArray(allDone) ? _i(allDone, null) > -1 : _q(allDone, true)
            },
            on: {
                "change": function($event) {
                    var $$a = allDone
                      , $$el = $event.target
                      , $$c = $$el.checked ? (true) : (false);
                    if (Array.isArray($$a)) {
                        var $$v = null
                          , $$i = _i($$a, $$v);
                        if ($$c) {
                            $$i < 0 && (allDone = $$a.concat($$v))
                        } else {
                            $$i > -1 && (allDone = $$a.slice(0, $$i).concat($$a.slice($$i + 1)))
                        }
                    } else {
                        allDone = $$c
                    }
                }
            }
        }), " ", _h('ul', {
            staticClass: "todo-list"
        }, [_l((filteredTodos), function(todo) {
            return _h('li', {
                key: todo.id,
                staticClass: "todo",
                class: {
                    completed: todo.completed,
                    editing: todo == editedTodo
                }
            }, [_h('div', {
                staticClass: "view"
            }, [_h('input', {
                staticClass: "toggle",
                attrs: {
                    "type": "checkbox"
                },
                domProps: {
                    "checked": Array.isArray(todo.completed) ? _i(todo.completed, null) > -1 : _q(todo.completed, true)
                },
                on: {
                    "change": function($event) {
                        var $$a = todo.completed
                          , $$el = $event.target
                          , $$c = $$el.checked ? (true) : (false);
                        if (Array.isArray($$a)) {
                            var $$v = null
                              , $$i = _i($$a, $$v);
                            if ($$c) {
                                $$i < 0 && (todo.completed = $$a.concat($$v))
                            } else {
                                $$i > -1 && (todo.completed = $$a.slice(0, $$i).concat($$a.slice($$i + 1)))
                            }
                        } else {
                            todo.completed = $$c
                        }
                    }
                }
            }), " ", _h('label', {
                on: {
                    "dblclick": function($event) {
                        editTodo(todo)
                    }
                }
            }, [_s(todo.title)]), " ", _h('button', {
                staticClass: "destroy",
                on: {
                    "click": function($event) {
                        removeTodo(todo)
                    }
                }
            })]), " ", _h('input', {
                directives: [{
                    name: "model",
                    value: (todo.title),
                    expression: "todo.title"
                }, {
                    name: "todo-focus",
                    value: (todo == editedTodo),
                    expression: "todo == editedTodo"
                }],
                staticClass: "edit",
                attrs: {
                    "type": "text"
                },
                domProps: {
                    "value": _s(todo.title)
                },
                on: {
                    "blur": function($event) {
                        doneEdit(todo)
                    },
                    "keyup": [function($event) {
                        if ($event.keyCode !== 13)
                            return;
                        doneEdit(todo)
                    }
                    , function($event) {
                        if ($event.keyCode !== 27)
                            return;
                        cancelEdit(todo)
                    }
                    ],
                    "input": function($event) {
                        if ($event.target.composing)
                            return;
                        todo.title = $event.target.value
                    }
                }
            })])
        })])]), " ", _h('footer', {
            directives: [{
                name: "show",
                value: (todos.length),
                expression: "todos.length"
            }],
            staticClass: "footer"
        }, [_h('span', {
            staticClass: "todo-count"
        }, [_h('strong', [_s(remaining)]), " " + _s(_f("pluralize")(remaining)) + " left\n\t\t\t\t"]), " ", _h('ul', {
            staticClass: "filters"
        }, [_h('li', [_h('a', {
            class: {
                selected: visibility == 'all'
            },
            attrs: {
                "href": "#/all"
            }
        }, ["All"])]), " ", _h('li', [_h('a', {
            class: {
                selected: visibility == 'active'
            },
            attrs: {
                "href": "#/active"
            }
        }, ["Active"])]), " ", _h('li', [_h('a', {
            class: {
                selected: visibility == 'completed'
            },
            attrs: {
                "href": "#/completed"
            }
        }, ["Completed"])])]), " ", _h('button', {
            directives: [{
                name: "show",
                value: (todos.length > remaining),
                expression: "todos.length > remaining"
            }],
            staticClass: "clear-completed",
            on: {
                "click": removeCompleted
            }
        }, ["\n\t\t\t\t\tClear completed\n\t\t\t\t"])])])
    }
}
)
 */
