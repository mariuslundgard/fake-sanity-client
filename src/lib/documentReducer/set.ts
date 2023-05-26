import {jsonpath} from '../jsonpath'
import {shallowClone} from '../shallowClone'

export function set(target: unknown, pathStr: string, value: unknown): unknown {
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
      console.warn('not found', {target: currentTarget, node})

      return ret
    }

    nextTarget = shallowClone(nextTarget)

    jsonpath.set(currentTarget, node, nextTarget)

    currentTarget = nextTarget
  }

  // set new value
  jsonpath.set(currentTarget, nodes[len - 1], value)

  return ret
}
