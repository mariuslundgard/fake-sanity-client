import {ClientConfig, ObservableSanityClient} from '@sanity/client'
import {HttpRequest} from 'get-it'
import {FakeContext} from './types'

/** @public */
export class FakeObservableSanityClient extends ObservableSanityClient {
  #request: HttpRequest

  public context: FakeContext

  constructor(request: HttpRequest, config: ClientConfig, context: FakeContext) {
    super(request, config)

    this.#request = request

    this.listen = context.listen.bind(this)
    this.context = context
  }

  clone(): FakeObservableSanityClient {
    return new FakeObservableSanityClient(this.#request, this.config(), this.context)
  }

  withConfig(newConfig?: Partial<ClientConfig>): FakeObservableSanityClient {
    return new FakeObservableSanityClient(
      this.#request,
      {...this.config(), ...newConfig},
      this.context
    )
  }
}
