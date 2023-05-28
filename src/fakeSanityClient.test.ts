import {expect, test, vi} from 'vitest'
import {createFakeSanityClient} from './createFakeSanityClient'

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

test('should patch with transaction', async () => {
  const client = createFakeSanityClient({
    documents: [
      {
        _type: 'test',
        _id: 'test',
        _rev: 'foo',
        _updatedAt: '2023-01-01T00:00:00.000Z',
        _createdAt: '2023-01-01T00:00:00.000Z',
      },
    ],
  })

  expect(client.context.documents[0].foo).toEqual(undefined)

  const tx = client.transaction().patch('test', {set: {foo: 'bar'}})

  await tx.commit()

  const req = client.context.log.request[0]

  expect(req.uri).toEqual('/data/mutate/fake')
  expect(req.body.mutations).toEqual([{patch: {id: 'test', set: {foo: 'bar'}}}])

  expect(client.context.documents[0].foo).toEqual('bar')
})

test('should emit events while patching', async () => {
  const client = createFakeSanityClient({
    documents: [
      {
        _type: 'test',
        _id: 'test',
        _rev: 'foo',
        _updatedAt: '2023-01-01T00:00:00.000Z',
        _createdAt: '2023-01-01T00:00:00.000Z',
      },
    ],
  })

  const event$ = client.listen(
    '*[_id == $id]',
    {id: 'test'},
    {events: ['welcome', 'mutation', 'reconnect']}
  )

  const observer = vi.fn()

  event$.subscribe(observer)

  await client
    .transaction()
    .patch('test', {set: {foo: 'bar'}})
    .commit()

  await delay(0)
})

test('should fetch', async () => {
  const client = createFakeSanityClient({
    documents: [
      {
        _type: 'test',
        _id: 'test',
        _rev: 'foo',
        _updatedAt: '2023-01-01T00:00:00.000Z',
        _createdAt: '2023-01-01T00:00:00.000Z',
        title: 'Test',
      },
    ],
  })

  const q = `*[_type == $id]{title}`

  const result = await client.fetch(q, {id: 'test'})

  expect(result).toEqual([{title: 'Test'}])

  const req = client.context.log.request[0]
  const url = new URL(req.url)

  expect(url.pathname).toEqual(`/v1/data/query/fake`)
  expect(url.searchParams.get('query')).toEqual(q)
})

test('should listen', () => {
  const client = createFakeSanityClient({
    documents: [
      {
        _type: 'test',
        _id: 'test',
        _rev: 'foo',
        _updatedAt: '2023-01-01T00:00:00.000Z',
        _createdAt: '2023-01-01T00:00:00.000Z',
        title: 'Test',
      },
    ],
  })

  const result$ = client.listen(`*[_type == $id]{title}`, {id: 'test'})

  result$.subscribe().unsubscribe()

  expect(client.context.log.listen).toEqual([
    {
      query: '*[_type == $id]{title}',
      params: {id: 'test'},
    },
  ])
})

test.only('should patch like PTE', async () => {
  const client = createFakeSanityClient({
    documents: [
      {
        _type: 'test',
        _id: 'test',
        _rev: 'foo',
        _updatedAt: '2023-01-01T00:00:00.000Z',
        _createdAt: '2023-01-01T00:00:00.000Z',
        title: 'Test',
      },
    ],
  })

  let tx = client.transaction()

  tx = tx.patch('test', {setIfMissing: {body: []}})
  tx = tx.patch('test', {setIfMissing: {body: []}})
  tx = tx.patch('test', {
    insert: {
      before: 'body[0]',
      items: [
        {
          _key: 'foo',
          _type: 'block',
          children: [
            {
              _key: 'bar',
              _type: 'span',
              text: '',
            },
          ],
        },
      ],
    },
  })
  tx = tx.patch('test', {
    diffMatchPatch: {'body[_key=="foo"].children[_key=="bar"].text': '@@ -0,0 +1 @@\n+s\n'},
  })

  await tx.commit()

  expect(client.context.documents[0].body).toEqual([
    {
      _key: 'foo',
      _type: 'block',
      children: [
        {
          _key: 'bar',
          _type: 'span',
          text: 's',
        },
      ],
    },
  ])
})
