import {ClientConfig, SanityClient} from '@sanity/client'
import {FakeContext} from './types'
import {FakeObservableSanityClient} from './FakeObservableSanityClient'
import {HttpRequest} from 'get-it'

/** @public */
export class FakeSanityClient extends SanityClient {
  #request: HttpRequest

  public context: FakeContext
  public observable: FakeObservableSanityClient

  constructor(request: HttpRequest, config: ClientConfig, context: FakeContext) {
    super(request, config)

    this.#request = request
    this.context = context
    this.listen = context.listen.bind(this)

    this.observable = new FakeObservableSanityClient(request, config, context)
  }

  clone(): FakeSanityClient {
    return new FakeSanityClient(this.#request, this.config(), this.context)
  }

  withConfig(newConfig?: Partial<ClientConfig>): FakeSanityClient {
    return new FakeSanityClient(this.#request, {...this.config(), ...newConfig}, this.context)
  }
}
