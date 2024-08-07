import { HttpContext } from '@adonisjs/core/http'
import { PubSub, Topic } from '@google-cloud/pubsub'

import type { NextFn } from '@adonisjs/core/types/http'
import fetch from 'sync-fetch'
import { v4 as uuidv4 } from 'uuid'

import { buildPayload } from 'apitoolkit-js'
import { APIToolkitConfig, ClientMetadata, Payload } from '../types.js'
import config from '@adonisjs/core/services/config'
import { observeAxiosGlobal, observeAxiosNotWebContext } from '../axios.js'
import { AxiosStatic } from 'axios'
import { reportError } from '../reportErrors.js'

const defaultConfig = {
  rootURL: 'https://app.apitoolkit.io',
  debug: false,
}

export default class APIToolkitMiddleware {
  #topicName: string | undefined
  #topic: Topic | undefined
  #pubsub: PubSub | undefined
  #project_id: string | undefined
  #config: APIToolkitConfig
  publishMessage: (payload: Payload) => void
  constructor() {
    const configs = config.get('apitoolkit', defaultConfig) as APIToolkitConfig
    const { rootURL = 'https://app.apitoolkit.io' } = configs
    let clientMetadata = configs.clientMetadata
    let pubsubClient: any
    if (!clientMetadata || configs.apiKey != '') {
      clientMetadata = this.getClientMetadata(rootURL, configs.apiKey)
      if (clientMetadata) {
        pubsubClient = new PubSub({
          projectId: clientMetadata.pubsub_project_id,
          authClient: new PubSub().auth.fromJSON(clientMetadata.pubsub_push_service_account),
        })
        const { topic_id, project_id } = clientMetadata
        this.#topicName = topic_id
        this.#pubsub = pubsubClient
        this.#project_id = project_id
      } else {
        this.#topicName = undefined
        this.#pubsub = pubsubClient
        this.#project_id = undefined
      }
    }

    if (configs.debug) {
      console.log('apitoolkit:  initialized successfully')
      console.dir(pubsubClient)
    }
    if (configs.monitorAxios) {
      observeAxiosGlobal(
        configs.monitorAxios,
        configs.redactHeaders,
        configs.redactRequestBody,
        configs.redactResponseBody,
        this
      )
    }

    this.#config = configs
    if (this.#pubsub && this.#topicName) {
      this.#topic = this.#pubsub?.topic(this.#topicName)
    }

    this.publishMessage = (payload: Payload) => {
      const callback = (err: any, messageId: any) => {
        if (this.#config?.debug) {
          console.log(
            'APIToolkit: pubsub publish callback called; messageId: ',
            messageId,
            ' error ',
            err
          )
          if (err != null) {
            console.log('APIToolkit: error publishing message to pubsub')
            console.error(err)
          }
        }
      }
      if (this.#topic) {
        this.#topic.publishMessage({ json: payload }, callback)
      } else {
        if (this.#config?.debug) {
          console.error('APIToolkit: error publishing message to pubsub, Undefined topic')
        }
      }
    }
  }

  public async close() {
    await this.#topic?.flush()
    await this.#pubsub?.close()
  }

  public getConfig() {
    return { project_id: this.#project_id, config: this.#config }
  }
  public observeAxios(
    axios: AxiosStatic,
    urlWildcard: string | undefined,
    redactHeaders: string[],
    redactRequestBody: string[],
    redactResponseBody: string[]
  ) {
    return observeAxiosNotWebContext(
      axios,
      urlWildcard,
      redactHeaders,
      redactRequestBody,
      redactResponseBody,
      this
    )
  }
  getClientMetadata(rootURL: string, apiKey: string) {
    const resp = fetch(rootURL + '/api/client_metadata', {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        Accept: 'application/json',
      },
    })
    if (!resp.ok) {
      if (resp.status === 401) {
        throw new Error('APIToolkit Error: Please check your API Key')
      } else {
        console.error(`Error getting apitoolkit client_metadata ${resp.status}`)
      }
      return
    }
    return resp.json() as ClientMetadata
  }

  public middleware() {
    const project_id = this.#project_id
    const config = this.#config
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const client = this
    class middleware {
      #project_id: string | undefined
      #config: APIToolkitConfig
      constructor() {
        this.#project_id = project_id
        this.#config = config
      }
      public async handle({ request, response }: HttpContext, next: NextFn) {
        if (this.#config?.debug) {
          console.log('APIToolkit: adonisjs middleware called')
        }

        if (this.#config?.disable || !this.#project_id) {
          await next()
          return
        }
        const ctx = HttpContext.get()
        const msg_id: string = uuidv4()
        const start_time = process.hrtime.bigint()
        if (ctx) {
          ctx.apitoolkitData = {
            client,
            msg_id,
            errors: [],
            config: this.#config,
            project_id: this.#project_id,
          }
        }
        const reqBody = this.getSafeBody(request.body())
        let serverError = null
        try {
          await next()
        } catch (error) {
          serverError = error
          reportError(serverError)
          throw error
        } finally {
          const respBody = this.getSafeBody(response.getBody())
          const errors = ctx?.apitoolkitData.errors || []
          const statusCode = serverError !== null ? 500 : response.response.statusCode
          if (this.#project_id) {
            const payload = buildPayload({
              start_time,
              reqBody,
              respBody,
              requestHeaders: request.headers(),
              responseHeaders: response.getHeaders(),
              reqParams: request.params(),
              status_code: statusCode,
              raw_url: request.url(true),
              url_path: request.ctx?.route?.pattern || '',
              reqQuery: request.qs(),
              method: request.method(),
              host: request.hostname() || '',
              redactHeaderLists: this.#config?.redactHeaders ?? [],
              redactRequestBody: this.#config?.redactRequestBody ?? [],
              redactResponseBody: this.#config?.redactResponseBody ?? [],
              errors,
              sdk_type: 'JsAdonis',
              service_version: this.#config?.serviceVersion,
              tags: this.#config?.tags ?? [],
              msg_id,
              parent_id: undefined,
              project_id: this.#project_id,
            })

            if (this.#config?.debug) {
              console.log('APIToolkit: publish prepared payload ')
              console.dir(payload)
            }
            client.publishMessage(payload)
          }
        }
      }
      getSafeBody(rqb: any): string {
        let result = ''
        if (typeof rqb === 'object') {
          try {
            result = JSON.stringify(rqb)
          } catch (error) {
            result = String(rqb)
          }
        } else {
          result = String(result)
        }
        return result
      }
    }
    return Promise.resolve({ default: middleware })
  }
}
