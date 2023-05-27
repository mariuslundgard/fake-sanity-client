import {Mutation, SanityDocument} from '@sanity/client'
import {isArray} from '../lib/predicates'
import {documentReducer} from '../documentReducer'

export function datasetReducer(
  dataset: SanityDocument[],
  mut: Mutation<any>,
  txId: string
): SanityDocument[] {
  // console.log('mutate', mut)

  if ('create' in mut) {
    const doc = mut.create

    const exists = dataset.some((d) => d._id === doc._id)

    if (!exists) {
      return [...dataset, {...doc, _rev: txId} as SanityDocument]
    }

    console.warn('document already exists', doc._id)

    return dataset
  }

  if ('createIfNotExists' in mut) {
    const doc = mut.createIfNotExists

    const exists = dataset.some((d) => d._id === doc._id)

    if (!exists) {
      return [...dataset, {...doc, _rev: txId} as SanityDocument]
    }

    return dataset
  }

  if ('createOrReplace' in mut) {
    const doc = mut.createOrReplace

    const idx = dataset.findIndex((d) => d._id === doc._id)

    if (idx === -1) {
      return [...dataset, {...doc, _rev: txId} as SanityDocument]
    }

    const datasetCopy = dataset.slice(0)
    datasetCopy[idx] = doc as SanityDocument

    return datasetCopy
  }

  if ('delete' in mut) {
    const selection = mut.delete

    if ('id' in selection) {
      const ids = isArray(selection.id) ? selection.id : [selection.id]

      return dataset.filter((d) => !ids.includes(d._id))
    }

    // eslint-disable-next-line no-console
    console.log('TODO: delete by query')

    return dataset
  }

  if ('patch' in mut) {
    const patch = mut.patch

    if ('id' in patch) {
      const idx = dataset.findIndex((d) => d._id === patch.id)
      const doc = idx > -1 ? dataset[idx] : undefined

      if (doc) {
        const copy = dataset.slice(0)
        copy[idx] = documentReducer(doc, patch as any, txId)
        return copy
      }
    } else {
      // todo
    }

    return dataset
  }

  // if code reaches here, it means we have a mutation type not supported

  return dataset
}
