# fake-sanity-client

> **WORK IN PROGRESS**

Fake (in-memory) Sanity client for testing.

## Installation

```sh
npm install fake-sanity-client
```

## Basic usage

```ts
import {createFakeSanityClient} from 'fake-sanity-client'

const fakeClient = createFakeSanityClient({
  documents: [],
})
```

## License

[MIT](LICENSE) © Marius Lundgård
