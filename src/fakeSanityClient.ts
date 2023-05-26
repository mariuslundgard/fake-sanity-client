/* eslint-disable max-depth */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */

import {v4 as uuidv4} from 'uuid'
import {
  ClientConfig,
  HttpRequest,
  HttpRequestEvent,
  ListenEvent,
  ListenOptions,
  Mutation,
  ObservableSanityClient,
  QueryParams,
  RequestOptions,
  SanityClient,
  SanityDocument,
  WelcomeEvent,
} from '@sanity/client'
import {Requester} from 'get-it'
import {parse, evaluate} from 'groq-js'
import {Observable, Subscriber} from 'rxjs'
import {
  DEFAULT_API_VERSION,
  DEFAULT_DATASET,
  DEFAULT_DOCUMENTS,
  DEFAULT_FAKE_RESOURCES,
  DEFAULT_PROJECT_ID,
} from './fakeDefaults'
import {documentReducer} from './lib/documentReducer'
import {isArray, isString} from './lib/predicates'

/** @alpha */
export interface FakeRequest {
  method: 'GET' | 'POST'
  uri: string
  json: boolean
  body: any
  query: Record<string, any>
  timeout: number
  headers: Record<string, string>
  token?: string
  tag?: string
  canUseCdn?: boolean
  signal?: AbortSignal
  url: string
  proxy?: unknown
  withCredentials: boolean
}

/** @alpha */
export interface FakeContext {
  documents: SanityDocument[]
  // eslint-disable-next-line no-use-before-define
  listen: (this: FakeSanityClient | FakeObservableSanityClient, ...args: any[]) => any
  log: {
    listen: {query: string; params: QueryParams; options: ListenOptions}[]
    request: FakeRequest[]
  }
  mutate: (transactionId: string | undefined, mutations: Mutation<any>[]) => void
  request: HttpRequest
}

/** @alpha */
export interface FakeClientLog {
  listen: {query: string; params: QueryParams; options: ListenOptions}[]
  request: FakeRequest[]
}

/** @alpha */
export class FakeObservableSanityClient extends ObservableSanityClient {
  public context: FakeContext

  constructor(context: FakeContext, config: ClientConfig) {
    super(context.request, config)

    this.listen = context.listen.bind(this)
    this.context = context
  }

  clone(): FakeObservableSanityClient {
    return new FakeObservableSanityClient(this.context, this.config())
  }

  withConfig(newConfig?: Partial<ClientConfig>): FakeObservableSanityClient {
    return new FakeObservableSanityClient(this.context, {...this.config(), ...newConfig})
  }
}

/** @alpha */
export class FakeSanityClient extends SanityClient {
  public context: FakeContext
  public observable: FakeObservableSanityClient

  constructor(context: FakeContext, config: ClientConfig) {
    super(context.request, config)

    this.context = context
    this.listen = context.listen.bind(this)
    this.observable = new FakeObservableSanityClient(context, config)
  }

  clone(): FakeSanityClient {
    return new FakeSanityClient(this.context, this.config())
  }

  withConfig(newConfig?: Partial<ClientConfig>): FakeSanityClient {
    return new FakeSanityClient(this.context, {...this.config(), ...newConfig})
  }
}

/** @alpha */
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

  const context: FakeContext = {
    documents: options?.documents ?? DEFAULT_DOCUMENTS,
    listen: _listen,
    log: {listen: [], request: []},
    mutate: _mutate,
    request: _createFakeRequester(),
  }

  const mockClient = new FakeSanityClient(context, {projectId, dataset, apiVersion, useCdn: false})

  const _listeners: {
    observer: Subscriber<ListenEvent<any>>
    name: string
    query: string
    params: QueryParams
    options: ListenOptions
  }[] = []

  return mockClient

  // eslint-disable-next-line max-statements
  async function _mutate(transactionId: string | undefined, mutations: Mutation<any>[]) {
    const txId = transactionId ?? uuidv4()
    const prevDocuments = context.documents

    for (const mut of mutations) {
      if ('create' in mut) {
        const doc = mut.create

        const exists = context.documents.some((d) => d._id === doc._id)

        if (!exists) {
          context.documents = [...context.documents, doc as SanityDocument]
          continue
        }

        console.warn('Document already exists', doc._id)
        continue
      }

      if ('createIfNotExists' in mut) {
        const doc = mut.createIfNotExists

        const exists = context.documents.some((d) => d._id === doc._id)

        if (!exists) {
          context.documents = [...context.documents, {...doc, _rev: txId} as SanityDocument]
          continue
        }

        continue
      }

      if ('createOrReplace' in mut) {
        const doc = mut.createOrReplace

        const idx = context.documents.findIndex((d) => d._id === doc._id)

        if (idx === -1) {
          context.documents = [...context.documents, doc as SanityDocument]
          continue
        }

        context.documents = context.documents.slice(0)
        context.documents[idx] = doc as SanityDocument

        continue
      }

      if ('delete' in mut) {
        const selection = mut.delete

        if ('id' in selection) {
          const ids = isArray(selection.id) ? selection.id : [selection.id]

          context.documents = context.documents.filter((d) => !ids.includes(d._id))
        } else {
          // todo
        }

        continue
      }

      if ('patch' in mut) {
        const patch = mut.patch

        if ('id' in patch) {
          const idx = context.documents.findIndex((d) => d._id === patch.id)
          const doc = idx > -1 ? context.documents[idx] : undefined

          if (doc) {
            context.documents = context.documents.slice(0)
            context.documents[idx] = documentReducer(doc, patch as any, txId)
          }
        } else {
          // todo
        }

        continue
      }

      // if code reaches here, it means we have a mutation type not supported
    }

    const affectedIds: string[] = []

    for (const listener of _listeners) {
      const prevDocs: SanityDocument[] = await _fetch(
        prevDocuments,
        listener.query,
        listener.params
      )

      const currentDocs: SanityDocument[] = await _fetch(
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

  // eslint-disable-next-line no-use-before-define
  function _listen(this: FakeSanityClient | FakeObservableSanityClient, ...args: any[]): any {
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

      _listeners.push(listener)

      return () => {
        const idx = _listeners.indexOf(listener)

        if (idx > -1) {
          _listeners.splice(idx, 1)
        }
      }
    })
  }

  async function _fetch(documents: SanityDocument[], query: string, params: QueryParams) {
    const tree = parse(query)
    const value = await evaluate(tree, {dataset: documents, params})
    const result = await value.get()

    return result ?? null
  }

  function _createFakeRequester(): HttpRequest {
    const mockRequester: Requester = (r) => {
      return Promise.resolve({
        body: {},
        headers: {},
        statusCode: 200,
        url: isString(r) ? r : r.url,
      })
    }

    mockRequester.clone = () => mockRequester
    mockRequester.use = () => mockRequester

    async function fetchResource(req: FakeRequest) {
      const url = new URL(req.url)

      const responseEntries = Object.entries(DEFAULT_FAKE_RESOURCES)

      for (const [rawUri, responseBody] of responseEntries) {
        const uri = rawUri.replace(/<dataset>/g, dataset).replace(/<project-id>/g, projectId)

        if (uri === req.uri) {
          return responseBody
        }
      }

      const pathSegments = url.pathname.split('/').filter(Boolean)

      // /<version>/data/query/<dataset>
      if (pathSegments[1] === 'data' && pathSegments[2] === 'query') {
        const groqQuery = url.searchParams.get('query')
        const params: Record<string, any> = {}

        for (const [key, value] of url.searchParams.entries()) {
          if (key.startsWith('$')) {
            const k = key.slice(1)

            params[k] = JSON.parse(value)
          }
        }

        if (!groqQuery) {
          throw new Error('/data/query: missing query')
        }

        const result = await _fetch(context.documents, groqQuery, params)

        return {result: result ?? null, ms: 0}
      }

      // /<version>/datasets
      if (req.uri === '/datasets') {
        return [
          {
            name: dataset,
            aclMode: 'public',
            createdAt: '2023-04-20T10:59:15.570Z',
            createdByUserId: 'grrm',
          },
        ]
      }

      // /<version>/data/mutate/<dataset>
      if (pathSegments[1] === 'data' && pathSegments[2] === 'mutate') {
        const affectedIds = await _mutate(req.body.transactionId, req.body.mutations)
        return {
          transactionId: req.body.transactionId,
          results: affectedIds.map((id) => ({id, operation: 'update'})),
          // results: [{id: 'drafts.99d010cc-ee6d-44c7-96c8-00ba261066e9', operation: 'update'}],
        }
      }

      // /<version>/versions
      if (pathSegments[1] === 'versions') {
        return {
          isSupported: true,
          isUpToDate: true,
          currentVersion: '3.0.0',
          latestVersion: '3.0.0',
          changelog: [],
        }
      }

      // /<version>/users/<id>
      if (pathSegments[1] === 'users' && typeof pathSegments[2] === 'string') {
        return DEFAULT_FAKE_RESOURCES['/users/me']
      }

      // /<version>/data/doc/<dataset>/<...ids>
      if (pathSegments[1] === 'data' && pathSegments[2] === 'doc') {
        const ids = pathSegments[4].split(',')
        const documents = context.documents.filter((d) => ids.includes(d._id))
        const omitted = context.documents
          .filter((d) => !ids.includes(d._id))
          .map((d) => ({
            id: d._id,
            reason: 'existence',
          }))

        return {
          documents,
          omitted,
        }
      }

      console.warn('unhandled request', url.pathname)

      return undefined
    }

    function _request(req: RequestOptions, requester: Requester) {
      mockClient.context.log.request.push(req as FakeRequest)

      return {
        subscribe(subscriber: Subscriber<HttpRequestEvent<any>>) {
          subscriber.next({
            type: 'progress',
            loaded: 0,
            total: 0,
            stage: 'download',
            percent: 100,
            lengthComputable: true,
          })

          fetchResource(req as FakeRequest)
            .then((body) => {
              if (body === undefined) {
                subscriber.error(new Error('not found'))
              }

              subscriber.next({
                type: 'response',
                body,
                url: (req as any).url,
                method: req.method ?? 'GET',
                statusCode: 200,
                headers: {},
              })

              subscriber.complete()
            })
            .catch((err) => {
              subscriber.error(err)
            })

          return {
            unsubscribe() {
              //
            },
          }
        },
      }
    }

    _request.defaultRequester = mockRequester

    return _request
  }
}
