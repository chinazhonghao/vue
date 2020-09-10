/* @flow */

import { parse } from './parser/index'
import { optimize } from './optimizer'
import { generate } from './codegen/index'

/**
 * Compile a template.
 */
// 实际生成AST的地方，options通过上层调用一层层传递
export function compile (
  template: string,
  options: CompilerOptions
): CompiledResult {
  // 1. HTML -> AST
  const ast = parse(template.trim(), options)
  // 2. 标记AST上的静态节点
  optimize(ast, options)
  const code = generate(ast, options)
  return {
    ast,
    render: code.render,
    staticRenderFns: code.staticRenderFns
  }
}
