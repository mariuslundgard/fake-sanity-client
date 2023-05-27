import {HttpRequest, HttpRequestEvent, RequestOptions} from '@sanity/client'
import {Requester} from 'get-it'
import {FakeContext, FakeRequest} from './types'
import {isString} from './lib/predicates'
import {Subscriber} from 'rxjs'

/** @internal */
export function createFakeRequester(context: FakeContext): HttpRequest {
  const fakeRequester: Requester = (req) => {
    return Promise.resolve({
      body: {},
      headers: {},
      statusCode: 200,
      url: isString(req) ? req : req.url,
    })
  }

  fakeRequester.clone = () => fakeRequester
  fakeRequester.use = () => fakeRequester

  async function fetchResource(req: FakeRequest) {
    const url = new URL(req.url)

    const responseEntries = Object.entries(context.resources)

    for (const [rawUri, responseBody] of responseEntries) {
      const uri = rawUri
        .replace(/<dataset>/g, context.dataset)
        .replace(/<project-id>/g, context.projectId)

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

      const result = await context.fetch(groqQuery, params)

      return {result: result ?? null, ms: 0}
    }

    // /<version>/datasets
    if (req.uri === '/datasets') {
      return [
        {
          name: context.dataset,
          aclMode: 'public',
          createdAt: '2023-04-20T10:59:15.570Z',
          createdByUserId: 'grrm',
        },
      ]
    }

    // /<version>/data/mutate/<dataset>
    if (pathSegments[1] === 'data' && pathSegments[2] === 'mutate') {
      const affectedIds = await context.mutate(req.body.transactionId, req.body.mutations)
      return {
        transactionId: req.body.transactionId,
        results: affectedIds.map((id) => ({id, operation: 'update'})),
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
      return context.resources['/users/me']
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

  function request(_req: RequestOptions, _requester: Requester) {
    const req = _req as FakeRequest

    context.log.request.push(req)

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

        fetchResource(req)
          .then((body) => {
            if (body === undefined) {
              subscriber.next({
                type: 'response',
                body: {message: `not found: ${req.url}`},
                url: req.url,
                method: req.method ?? 'GET',
                statusCode: 404,
                headers: {},
              })
            } else {
              subscriber.next({
                type: 'response',
                body,
                url: req.url,
                method: req.method ?? 'GET',
                statusCode: 200,
                headers: {},
              })
            }

            subscriber.complete()
          })
          .catch(subscriber.error)

        return {
          unsubscribe() {
            subscriber.complete()
          },
        }
      },
    }
  }

  request.defaultRequester = fakeRequester

  return request
}
