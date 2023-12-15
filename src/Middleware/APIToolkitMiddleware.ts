import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { HttpContext } from "@adonisjs/core/build/standalone";
import { inject } from '@adonisjs/core/build/standalone'

import { PubSub, Topic } from '@google-cloud/pubsub';
import fetch from 'sync-fetch';
import { v4 as uuidv4 } from 'uuid';
import { APIToolkitConfig, ClientMetadata } from "@ioc:APIToolkit";

import { buildPayload } from 'apitoolkit-js';
import { ATError, Payload } from "../payload";

const defaultConfig = {
    rootURL: 'https://app.apitoolkit.io',
    debug: false,
};

declare module '@ioc:Adonis/Core/HttpContext' {
    interface HttpContextContract {
        apitoolkitData: {
            client: APIToolkitMiddleware;
            msg_id: string;
            errors: ATError[];
            config: APIToolkitConfig;
            project_id: string;
        };
    }
}

@inject(['Adonis/Core/Application'])
export class APIToolkitMiddleware {
    #topicName: string;
    #topic: Topic | undefined;
    #pubsub: PubSub | undefined;
    #project_id: string;
    #config: APIToolkitConfig;
    publishMessage: (payload: Payload) => void;
    constructor(private app: ApplicationContract) {
        this.app.container.singleton("APIToolkit", () => {
            return this
        })
        let config = this.app.container.resolveBinding('Adonis/Core/Config').merge('apitoolkit.apitoolkitConfig', defaultConfig) as APIToolkitConfig

        let { rootURL = 'https://app.apitoolkit.io', clientMetadata } = config;


        let pubsubClient: any;
        if (!clientMetadata || config.apiKey != '') {
            clientMetadata = this.getClientMetadata(rootURL, config.apiKey);
            pubsubClient = new PubSub({
                projectId: clientMetadata.pubsub_project_id,
                authClient: new PubSub().auth.fromJSON(clientMetadata.pubsub_push_service_account),
            });
        }

        const { topic_id, project_id } = clientMetadata;
        if (config.debug) {
            console.log('apitoolkit:  initialized successfully');
            console.dir(pubsubClient);
        }

        this.#topicName = topic_id;
        this.#pubsub = pubsubClient
        this.#project_id = project_id;
        this.#config = config;
        if (this.#pubsub && this.#topicName) {
            this.#topic = this.#pubsub?.topic(this.#topicName);
        }

        this.publishMessage = (payload: Payload) => {
            const callback = (err: any, messageId: any) => {
                if (this.#config?.debug) {
                    console.log(
                        'APIToolkit: pubsub publish callback called; messageId: ',
                        messageId,
                        ' error ',
                        err
                    );
                    if (err != null) {
                        console.log('APIToolkit: error publishing message to pubsub');
                        console.error(err);
                    }
                }
            };
            if (this.#topic) {
                this.#topic.publishMessage({ json: payload }, callback);
            } else {
                if (this.#config?.debug) {
                    console.error('APIToolkit: error publishing message to pubsub, Undefined topic');
                }
            }
        };
    }

    public async close() {
        await this.#topic?.flush();
        await this.#pubsub?.close();
    }

    getClientMetadata(rootURL: string, apiKey: string) {
        const resp = fetch(rootURL + '/api/client_metadata', {
            method: 'GET',
            headers: {
                Authorization: 'Bearer ' + apiKey,
                Accept: 'application/json',
            },
        });
        if (!resp.ok) throw new Error(`Error getting apitoolkit client_metadata ${resp.status}`);
        return (resp.json()) as ClientMetadata;
    }

    public async handle({ request, response }: HttpContextContract, next: () => Promise<void>) {
        if (this.#config?.disable) {
            await next();
            return;
        }
        const ctx = HttpContext.get();
        const msg_id: string = uuidv4();
        const start_time = process.hrtime.bigint();
        if (ctx) {
            ctx.apitoolkitData = { client: this, msg_id, errors: [], config: this.#config, project_id: this.#project_id }
        }

        let reqBody = this.getSafeBody(request.body());
        await next()
        if (this.#config?.debug) {
            console.log('APIToolkit: adonisjs middleware called');
        }
        let respBody = this.getSafeBody(response.getBody());
        const errors = ctx?.apitoolkitData.errors || [];
        if (this.#project_id) {
            const payload = buildPayload({
                start_time,
                reqBody,
                respBody,
                requestHeaders: request.headers,
                responseHeaders: response.getHeaders(),
                reqParams: request.params(),
                status_code: response.response.statusCode,
                raw_url: request.url(true),
                url_path: request.ctx?.route?.pattern || "",
                reqQuery: request.qs(),
                method: request.method(),
                host: request.hostname() || "",
                redactHeaderLists: this.#config?.redactHeaders ?? [],
                redactRequestBody: this.#config?.redactRequestBody ?? [],
                redactResponseBody: this.#config?.redactResponseBody ?? [],
                errors,
                sdk_type: "JsAdonis",
                service_version: this.#config?.serviceVersion,
                tags: this.#config?.tags ?? [],
                msg_id,
                parent_id: undefined,
                project_id: this.#project_id,
            });

            if (this.#config?.debug) {
                console.log('APIToolkit: publish prepared payload ');
                console.dir(payload);
            }
            this.publishMessage(payload);
        }
    }

    getSafeBody(rqb: any): string {
        let result = '';
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

