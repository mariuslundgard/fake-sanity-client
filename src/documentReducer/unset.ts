import {jsonpath} from '../lib/jsonpath'
import {isRecord} from '../lib/predicates'
import {shallowClone} from '../lib/shallowClone'

export function unset(target: unknown, pathStr: string): unknown {
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

  const segment = nodes[len - 1]

  if (segment.type === 'attribute') {
    if (!isRecord(currentTarget)) {
      throw new Error('target must be a record')
    }

    delete currentTarget[segment.name]
  }

  return ret
}
