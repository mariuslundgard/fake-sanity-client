import {jsonpath} from '../lib/jsonpath'
import {shallowClone} from '../lib/shallowClone'

export function setIfMissing(target: unknown, pathStr: string, value: unknown): unknown {
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

  const segment = nodes[len - 1]

  const currentValue = jsonpath.get(currentTarget, segment)

  if (currentValue === undefined) {
    jsonpath.set(currentTarget, segment, value)
  }

  return ret
}
