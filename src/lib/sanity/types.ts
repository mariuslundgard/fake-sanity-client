/* eslint-disable no-use-before-define */

/** @public */
export interface ObjectValue {
  _type: string
  [key: string]: Value
}

/** @public */
export type ArrayValue = Array<PrimitiveValue | ObjectValue>

/** @public */
export type PrimitiveValue = string | number | boolean | null

/** @public */
export type Value = PrimitiveValue | ArrayValue | ObjectValue

/** @public */
export interface DocumentValue {
  _id: string
  _type: string
  [key: string]: Value | undefined
}

/** @public */
export interface PersistedDocumentValue extends DocumentValue {
  _createdAt: string
  _updatedAt: string
  _rev: string
}

/** @public */
export interface CreateIfNotExistsMutation {
  createIfNotExists: DocumentValue
}

/** @public */
export interface Patch {
  dec?: Record<string, number>
  diffMatchPatch?: Record<string, string>
  inc?: Record<string, number>
  insert?:
    | {
        after: string
        items: ArrayValue
      }
    | {
        before: string
        items: ArrayValue
      }
    | {
        replace: string
        items: ArrayValue
      }
  set?: Record<string, string>
  setIfMissing?: Record<string, string>
  unset?: string[]
}

/** @public */
export interface PatchMutation {
  patch: Patch & {id: string}
}

/** @public */
export type Mutation = CreateIfNotExistsMutation | PatchMutation
