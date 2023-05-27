import {ListenOptions, Mutation, QueryParams, SanityDocument} from '@sanity/client'

/** @public */
export interface FakeRequest {
  method: 'GET' | 'POST'
  body: any
  canUseCdn?: boolean
  headers: Record<string, string>
  json: boolean
  proxy?: unknown
  query: Record<string, any>
  signal?: AbortSignal
  tag?: string
  timeout: number
  token?: string
  uri: string
  url: string
  withCredentials: boolean
}

/** @public */
export interface FakeContext {
  dataset: string
  projectId: string
  documents: SanityDocument[]
  fetch: (query: string, params: QueryParams) => Promise<any>
  // eslint-disable-next-line no-use-before-define
  // listen: (this: FakeSanityClient | FakeObservableSanityClient, ...args: any[]) => any
  listen: (this: any, ...args: any[]) => any
  log: {
    listen: {query: string; params: QueryParams; options: ListenOptions}[]
    request: FakeRequest[]
  }
  mutate: (transactionId: string | undefined, mutations: Mutation<any>[]) => Promise<string[]>
  resources: Record<string, any>
}

/** @public */
export interface FakeClientLog {
  listen: {query: string; params: QueryParams; options: ListenOptions}[]
  request: FakeRequest[]
}
