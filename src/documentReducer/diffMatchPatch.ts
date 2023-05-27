import {jsonpath} from '../lib/jsonpath'
import {shallowClone} from '../lib/shallowClone'
import {dmp} from './dmp'

export function diffMatchPatch(target: unknown, pathStr: string, patchStr: string): unknown {
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

  const dmpPatch = dmp.patch_fromText(patchStr)
  const prevText = jsonpath.get(currentTarget, nodes[len - 1])

  if (typeof prevText !== 'string') {
    console.error('expected string', {target, nodes})
    return ret
  }

  // set new value
  jsonpath.set(currentTarget, nodes[len - 1], dmp.patch_apply(dmpPatch, prevText)[0])

  return ret
}
