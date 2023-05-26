/* eslint-disable max-depth */

import {isArray, isRecord} from '../predicates'
import {get} from './get'
import {Expr} from './types'

export function set(source: unknown, node: Expr, value: unknown): void {
  if (node.type === 'attribute') {
    if (!isRecord(source)) {
      throw new Error('jsonpath.set(): source is not a record')
    }

    source[node.name] = value

    return
  }

  if (node.type === 'union') {
    if (node.nodes.length === 1) {
      const n = node.nodes[0]

      if (n.type === 'constraint') {
        if (!isArray(source)) {
          throw new Error('jsonpath.set(): source is not an array')
        }

        for (const item of source) {
          const l = get(item, n.lhs)
          const r = get(item, n.rhs)

          if (n.operator === '==') {
            if (l === r) {
              source.splice(source.indexOf(item), 1, value)

              return
            }
          } else {
            throw new Error(`jsonpath.set(): unexpected operator: "${n.operator}"`)
          }
        }

        // no match
        return
      }
    }

    throw new Error('jsonpath.set(): only supports certain unions')
  }

  throw new Error(`jsonpath.set(): unexpected expression: "${node.type}"`)
}
