import {PatchMutation, PersistedDocumentValue} from '../lib/sanity'
import {shallowClone} from '../lib/shallowClone'
import {dec} from './dec'
import {diffMatchPatch} from './diffMatchPatch'
import {inc} from './inc'
import {insert} from './insert'
import {set} from './set'
import {setIfMissing} from './setIfMissing'
import {unset} from './unset'

export function documentReducer(
  value: PersistedDocumentValue,
  patch: PatchMutation['patch'],
  rev: string
): PersistedDocumentValue {
  let d = value

  if (!d) {
    throw new Error('no document value')
  }

  // Check if the patch matches the document
  // TODO: `ifRevisionId`
  if (d._id !== patch.id) {
    return d
  }

  if (patch.set) {
    d = shallowClone(d) as PersistedDocumentValue

    for (const [key, val] of Object.entries(patch.set)) {
      d = set(d, key, val) as PersistedDocumentValue
    }

    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  if (patch.setIfMissing) {
    d = shallowClone(d) as PersistedDocumentValue

    for (const [key, val] of Object.entries(patch.setIfMissing)) {
      d = setIfMissing(d, key, val) as PersistedDocumentValue
    }

    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  if (patch.unset) {
    d = shallowClone(d) as PersistedDocumentValue

    for (const pathStr of patch.unset) {
      d = unset(d, pathStr) as PersistedDocumentValue
    }

    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  if (patch.dec) {
    d = shallowClone(d) as PersistedDocumentValue

    for (const [key, val] of Object.entries(patch.dec)) {
      d = dec(d, key, val) as PersistedDocumentValue
    }

    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  if (patch.inc) {
    d = shallowClone(d) as PersistedDocumentValue

    for (const [key, val] of Object.entries(patch.inc)) {
      d = inc(d, key, val) as PersistedDocumentValue
    }

    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  if (patch.diffMatchPatch) {
    d = shallowClone(d) as PersistedDocumentValue

    for (const [key, val] of Object.entries(patch.diffMatchPatch)) {
      d = diffMatchPatch(d, key, val) as PersistedDocumentValue
    }

    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  if (patch.insert) {
    d = insert(d, patch.insert) as PersistedDocumentValue
    d._updatedAt = new Date().toUTCString()
    d._rev = rev
  }

  return d
}
