import {jsonpath} from '../lib/jsonpath'
import {shallowClone} from '../lib/shallowClone'

export function inc(target: unknown, pathStr: string, incBy: number): unknown {
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

  // set new value

  const currentValue = jsonpath.get(currentTarget, nodes[len - 1])

  if (typeof currentValue !== 'number') {
    throw new Error('value is not a number')
  }

  jsonpath.set(currentTarget, nodes[len - 1], currentValue + incBy)

  return ret
}
