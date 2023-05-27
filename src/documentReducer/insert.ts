import {jsonpath} from '../lib/jsonpath'
import {isArray} from '../lib/predicates'
import {Patch} from '../lib/sanity'
import {shallowClone} from '../lib/shallowClone'

export function insert(target: unknown, _insert: NonNullable<Patch['insert']>): unknown {
  const pathStr =
    ('after' in _insert && _insert.after) ||
    ('before' in _insert && _insert.before) ||
    ('replace' in _insert && _insert.replace)

  if (!pathStr) {
    throw new Error('insert: missing either `after`, `before` or `replace` property')
  }

  const path = jsonpath.parse(pathStr)

  if (!path) {
    throw new Error('could not parse jsonpath')
  }

  const {nodes} = path
  const ret = shallowClone(target)
  const len = nodes.length

  let currentTarget: unknown = ret

  for (let i = 0; i < len - 1; i += 1) {
    const node = nodes[i]

    let nextTarget = jsonpath.get(currentTarget, node)

    if (!nextTarget) {
      console.warn('target not found', {target, node})
      return target
    }

    nextTarget = shallowClone(nextTarget)

    jsonpath.set(currentTarget, node, nextTarget)

    currentTarget = nextTarget
  }

  const node = nodes[len - 1]

  if (!isArray(currentTarget)) {
    throw new Error('not an array')
  }

  const currentValue = jsonpath.get(currentTarget, node)

  if (
    !currentValue &&
    node.type === 'union' &&
    node.nodes.length === 1 &&
    node.nodes[0].type === 'index' &&
    node.nodes[0].value === -1
  ) {
    // Push
    currentTarget.push(..._insert.items)

    return ret
  }

  const idx = currentTarget.indexOf(currentValue)

  if (idx === -1) {
    console.error('not found', {currentValue, currentTarget})

    // throw new Error('value not found')
    return ret
  }

  if ('after' in _insert) {
    currentTarget.splice(idx + 1, 0, ..._insert.items)
  } else if ('before' in _insert) {
    currentTarget.splice(idx, 0, ..._insert.items)
  } else if ('replace' in _insert) {
    currentTarget.splice(idx, 1, ..._insert.items)
  }

  return ret
}
