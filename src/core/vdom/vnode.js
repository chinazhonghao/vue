/* @flow */
// VNode中含有对应的DOM节点
export default class VNode {
  tag: string | void;
  data: VNodeData | void;
  children: Array<VNode> | void;
  text: string | void;
  // 浏览器中Node是native code
  elm: Node | void;
  ns: string | void;
  context: Component | void; // rendered in this component's scope
  key: string | number | void;
  componentOptions: VNodeComponentOptions | void;
  // 这里不可以有多个字组件吗？？上面有children属性了，这里还要child有什么用呢？？
  child: Component | void; // component instance
  parent: VNode | void; // compoennt placeholder node
  raw: boolean; // contains raw HTML? (server only)
  isStatic: boolean; // hoisted static node
  isRootInsert: boolean; // necessary for enter transition check
  isComment: boolean; // empty comment placeholder?
  isCloned: boolean; // is a cloned node?

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: Array<VNode> | void,
    text?: string,
    elm?: Node,
    ns?: string | void,
    context?: Component,
    componentOptions?: VNodeComponentOptions
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = ns
    this.context = context
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.child = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
  }
}

export const emptyVNode = () => {
  // 这里不传参数也可吗？？？定义的构造函数好像没有约束力
  const node = new VNode()
  node.text = ''
  node.isComment = true
  return node
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.ns,
    vnode.context,
    vnode.componentOptions
  )
  cloned.isStatic = vnode.isStatic
  // 这里key设置成一样不会有更新上的问题吗？？
  cloned.key = vnode.key
  cloned.isCloned = true
  return cloned
}

export function cloneVNodes (vnodes: Array<VNode>): Array<VNode> {
  const res = new Array(vnodes.length)
  for (let i = 0; i < vnodes.length; i++) {
    res[i] = cloneVNode(vnodes[i])
  }
  return res
}
