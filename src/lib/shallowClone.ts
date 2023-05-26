import {basicAssign} from './basicAssign'
import {isArray, isRecord} from './predicates'

export function shallowClone(source: unknown): Record<string, unknown> | Array<unknown> {
  if (isArray(source)) return source.slice(0)
  if (isRecord(source)) return basicAssign({}, source)

  throw new Error('shallowClone: source must be an object or an array')
}
