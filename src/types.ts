import {
  // HttpRequest,
  ListenOptions,
  Mutation,
  QueryParams,
  SanityDocument,
} from '@sanity/client'

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
  dataset: string
  projectId: string
  documents: SanityDocument[]
  fetch: (documents: SanityDocument[], query: string, params: QueryParams) => Promise<any>
  // eslint-disable-next-line no-use-before-define
  // listen: (this: FakeSanityClient | FakeObservableSanityClient, ...args: any[]) => any
  listen: (this: any, ...args: any[]) => any
  log: {
    listen: {query: string; params: QueryParams; options: ListenOptions}[]
    request: FakeRequest[]
  }
  mutate: (transactionId: string | undefined, mutations: Mutation<any>[]) => Promise<string[]>
  // request: HttpRequest
  resources: Record<string, any>
}

/** @alpha */
export interface FakeClientLog {
  listen: {query: string; params: QueryParams; options: ListenOptions}[]
  request: FakeRequest[]
}
