import {v4 as uuidv4} from 'uuid'
import {
  ClientConfig,
  ListenEvent,
  ListenOptions,
  Mutation,
  QueryParams,
  SanityDocument,
  WelcomeEvent,
} from '@sanity/client'
import {parse, evaluate} from 'groq-js'
import {Observable, Subscriber} from 'rxjs'
import {datasetReducer} from './datasetReducer'
import {
  DEFAULT_API_VERSION,
  DEFAULT_DATASET,
  DEFAULT_DOCUMENTS,
  DEFAULT_FAKE_RESOURCES,
  DEFAULT_PROJECT_ID,
} from './fakeDefaults'
import {createFakeRequester} from './fakeRequester'
import {FakeContext} from './types'
import {FakeObservableSanityClient} from './FakeObservableSanityClient'
import {FakeSanityClient} from './FakeSanityClient'

interface FakeListener {
  observer: Subscriber<ListenEvent<any>>
  name: string
  query: string
  params: QueryParams
  options: ListenOptions
}

/** @public */
export function createFakeSanityClient(options?: {
  apiVersion?: string
  dataset?: string
  documents?: SanityDocument[]
  projectId?: string
}): FakeSanityClient {
  const {
    apiVersion = DEFAULT_API_VERSION,
    dataset = DEFAULT_DATASET,
    projectId = DEFAULT_PROJECT_ID,
  } = options ?? {}

  const listeners: FakeListener[] = []

  const context: FakeContext = {
    dataset,
    projectId,
    documents: options?.documents ?? DEFAULT_DOCUMENTS,
    fetch,
    listen,
    log: {listen: [], request: []},
    mutate,
    resources: DEFAULT_FAKE_RESOURCES,
  }

  const request = createFakeRequester(context)

  const clientConfig: ClientConfig = {
    projectId,
    dataset,
    apiVersion,
    useCdn: false,
  }

  return new FakeSanityClient(request, clientConfig, context)

  async function mutate(
    transactionId: string | undefined,
    mutations: Mutation<any>[]
  ): Promise<string[]> {
    const txId = transactionId ?? uuidv4()
    const prevDocuments = context.documents

    // apply mutations
    for (const mut of mutations) {
      context.documents = datasetReducer(context.documents, mut, txId)
    }

    const affectedIds: string[] = []

    for (const listener of listeners) {
      const prevDocs: SanityDocument[] = await fetch(prevDocuments, listener.query, listener.params)

      const currentDocs: SanityDocument[] = await fetch(
        context.documents,
        listener.query,
        listener.params
      )

      for (const current of currentDocs) {
        const id = current._id
        const prev = prevDocs.find((d) => d._id === id)

        if (prev !== current) {
          affectedIds.push(id)

          listener.observer.next({
            type: 'mutation',
            effects: {apply: [], revert: []},
            eventId: `${txId}#${id}`,
            documentId: id,
            transactionId: txId,
            transition: 'update',
            identity: DEFAULT_FAKE_RESOURCES['/users/me'].id, // todo
            mutations,
            result: current,
            previousRev: prev?._rev,
            resultRev: current._rev,
            timestamp: new Date().toISOString(),
            visibility: 'query',
            // transactionCurrentEvent: 1,
            // transactionTotalEvents: 1,
          })
        }
      }
    }

    return affectedIds
  }

  function listen(this: FakeSanityClient | FakeObservableSanityClient, ...args: any[]): any {
    const listenerName = uuidv4().replace(/-/g, '').slice(0, 22)
    const listenQuery: string = args[0]
    const listenParams: QueryParams = args[1]
    const listenOptions: ListenOptions = args[2]

    context.log.listen.push({
      query: listenQuery,
      params: listenParams,
      options: listenOptions,
    })

    return new Observable<ListenEvent<any>>((observer) => {
      observer.next({type: 'welcome', listenerName} as WelcomeEvent)

      const listener = {
        observer,
        name: listenerName,
        query: listenQuery,
        params: listenParams,
        options: listenOptions,
      }

      listeners.push(listener)

      return () => {
        const idx = listeners.indexOf(listener)

        if (idx > -1) {
          listeners.splice(idx, 1)
        }
      }
    })
  }

  async function fetch(documents: SanityDocument[], query: string, params: QueryParams) {
    const tree = parse(query)
    const value = await evaluate(tree, {dataset: documents, params})
    const result = await value.get()

    return result ?? null
  }
}
