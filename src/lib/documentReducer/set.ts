import {parse} from '../jsonpath/parse'
import {shallowClone} from '../shallowClone'
import {_get, _set} from './helpers'

export function set(target: unknown, pathStr: string, value: unknown) {
  const path = parse(pathStr)

  if (!path) {
    throw new Error('could not parse jsonpath')
  }

  const {nodes} = path

  const ret = shallowClone(target)
  const len = nodes.length

  let currentTarget: unknown = ret

  for (let i = 0; i < len - 1; i += 1) {
    const node = nodes[i]

    let nextTarget = _get(currentTarget, node)

    if (!nextTarget) {
      throw new Error(`not found: ${JSON.stringify(node)}`)
    }

    nextTarget = shallowClone(nextTarget)

    _set(currentTarget, node, nextTarget)

    currentTarget = nextTarget
  }

  // set new value
  _set(currentTarget, nodes[len - 1], value)

  return ret
}
