/* eslint-disable max-depth */

import {isArray, isRecord} from '../predicates'
import {parse} from './parse'
import {Expr} from './types'

export function get(source: unknown, node: string | Expr): unknown {
  if (typeof node === 'string') {
    const parsedNode = parse(node)

    if (!parsedNode) {
      throw new Error(`jsonpath.get(): could not parse path \`${node}\``)
    }

    return get(source, parsedNode)
  }

  if (node.type === 'attribute') {
    if (!isRecord(source)) {
      throw new Error('jsonpath.get(): source is not a record')
    }

    return source[node.name]
  }

  if (node.type === 'union') {
    if (node.nodes.length === 1 && node.nodes[0].type === 'index') {
      if (!isArray(source)) {
        throw new Error('jsonpath.get(): source is not an array')
      }

      if (node.nodes[0].value === -1) {
        return source[source.length - 1]
      }

      return source[node.nodes[0].value]
    }

    if (node.nodes.length === 1 && node.nodes[0].type === 'constraint') {
      if (!isArray(source)) {
        throw new Error('jsonpath.get(): source is not an array')
      }

      for (const item of source) {
        const l = get(item, node.nodes[0].lhs)
        const r = get(item, node.nodes[0].rhs)

        if (l === r) {
          if (node.nodes[0].operator === '==') {
            return item
          }

          throw new Error(`jsonpath.get(): does not support operator "${node.nodes[0].operator}"}"`)
        }
      }

      return undefined
    }

    throw new Error('jsonpath.get(): only supports certain unions')
  }

  if (node.type === 'path') {
    let current = source

    for (const child of node.nodes) {
      current = get(current, child)
    }

    return current
  }

  if (node.type === 'string') {
    return node.value
  }

  throw new Error(`jsonpath.get(): unexpected expression: "${node.type}"`)
}
