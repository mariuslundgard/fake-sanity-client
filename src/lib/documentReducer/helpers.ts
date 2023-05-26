import {Expr} from '../jsonpath/types'
import {isArray, isRecord} from '../predicates'

export function _get(source: unknown, node: Expr): unknown {
  if (node.type === 'attribute') {
    if (!isRecord(source)) {
      throw new Error('source is not a record')
    }

    return source[node.name]
  }

  if (node.type === 'union') {
    if (node.nodes.length === 1 && node.nodes[0].type === 'index') {
      if (!isArray(source)) {
        throw new Error('source is not an array')
      }

      if (node.nodes[0].value === -1) {
        return source[source.length - 1]
      }

      return source[node.nodes[0].value]
    }
  }

  throw new Error(`_get(): unexpected expression: "${node.type}"`)
}

export function _set(source: unknown, node: Expr, value: unknown) {
  if (node.type === 'attribute') {
    if (!isRecord(source)) {
      throw new Error('source is not a record')
    }

    source[node.name] = value

    return
  }

  throw new Error(`_set(): unexpected expression: "${node.type}"`)
}
