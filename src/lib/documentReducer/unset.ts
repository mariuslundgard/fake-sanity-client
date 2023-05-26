import {parse} from '../jsonpath/parse'
import {isRecord} from '../predicates'
import {shallowClone} from '../shallowClone'
import {_get, _set} from './helpers'

export function unset(target: unknown, pathStr: string) {
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

  const segment = nodes[len - 1]

  if (segment.type === 'attribute') {
    if (!isRecord(currentTarget)) {
      throw new Error('target must be a record')
    }

    delete currentTarget[segment.name]
  }

  return ret
}
