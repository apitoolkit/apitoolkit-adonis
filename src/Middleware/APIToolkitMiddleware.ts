import { ApplicationContract } from '@ioc:Adonis/Core/Application'
import { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import { inject } from '@adonisjs/core/build/standalone'

import { PubSub, Topic } from '@google-cloud/pubsub';
import { AsyncLocalStorage } from 'async_hooks';
import fetch from 'sync-fetch';
import { v4 as uuidv4 } from 'uuid';
import { APIToolkitConfig, ClientMetadata } from "@ioc:APIToolkit";

import { ATError, buildPayload, Payload } from '../payload';


export const asyncLocalStorage = new AsyncLocalStorage<Map<string, any>>();
const defaultConfig = {
    rootURL: 'https://app.apitoolkit.io',
    debug: false,
};

@inject(['Adonis/Core/Application'])
export class APIToolkitMiddleware {
    #topicName: string;
    #topic: Topic | undefined;
    #pubsub: PubSub | undefined;
    #project_id: string;
    #config: APIToolkitConfig;
    publishMessage: (payload: Payload) => void;
    constructor(private app: ApplicationContract) {

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

    public async handle(
        { request, response }: HttpContextContract,
        next: () => Promise<void>
    ) {
        const start_time = process.hrtime.bigint();
        asyncLocalStorage.run(new Map(), async () => {
            asyncLocalStorage.getStore()!.set('AT_client', this);
            asyncLocalStorage.getStore()!.set('AT_project_id', this.#project_id);
            asyncLocalStorage.getStore()!.set('AT_config', this.#config);
            asyncLocalStorage.getStore()!.set('AT_errors', []);
            const msg_id: string = uuidv4();
            asyncLocalStorage.getStore()!.set('AT_msg_id', msg_id);

            if (this.#config?.debug) {
                console.log('APIToolkit: adonisjs middleware called');
            }
            await next()
            let reqBody = this.getSafeBody(request.body());
            let respBody = this.getSafeBody(response.getBody());

            const errors = asyncLocalStorage.getStore()?.get('AT_errors') ?? [];
            if (this.#project_id) {
                const payload = buildPayload(
                    start_time,
                    request,
                    response,
                    reqBody,
                    respBody,
                    this.#config?.redactRequestBody ?? [],
                    this.#config?.redactResponseBody ?? [],
                    this.#config?.redactHeaders ?? [],
                    this.#project_id,
                    errors,
                    this.#config?.serviceVersion,
                    this.#config?.tags ?? [],
                    msg_id,
                    undefined
                );

                if (this.#config?.debug) {
                    console.log('APIToolkit: publish prepared payload ');
                    console.dir(payload);
                }
                this.publishMessage(payload);
            }
        });
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

export function ReportError(error: any) {
    if (asyncLocalStorage.getStore() == null) {
        console.log(
            "APIToolkit: ReportError used outside of the APIToolkit middleware's scope. Use the APIToolkitClient.ReportError instead, if you're not in a web context."
        );
        return Promise.reject(error);
    }

    const resp = normaliseError(error);
    if (!resp) {
        return;
    }

    const [nError, _internalFrames] = resp;
    const atError = buildError(nError);
    const errList: ATError[] = asyncLocalStorage.getStore()!.get('AT_errors');
    errList.push(atError);
    asyncLocalStorage.getStore()!.set('AT_errors', errList);
}

// Recursively unwraps an error and returns the original cause.
function rootCause(err: Error): Error {
    let cause = err;
    while (cause && (cause as any).cause) {
        cause = (cause as any).cause;
    }
    return cause;
}

function normaliseError(maybeError: any): [Error, number] | undefined {
    let error;
    let internalFrames = 0;

    // In some cases:
    //
    //  - the promise rejection handler (both in the browser and node)
    //  - the node uncaughtException handler
    //
    // We are really limited in what we can do to get a stacktrace. So we use the
    // tolerateNonErrors option to ensure that the resulting error communicates as
    // such.
    switch (typeof maybeError) {
        case 'string':
        case 'number':
        case 'boolean':
            error = new Error(String(maybeError));
            internalFrames += 1;
            break;
        case 'function':
            return;
        case 'object':
            if (maybeError !== null && isError(maybeError)) {
                error = maybeError;
            } else if (maybeError !== null && hasNecessaryFields(maybeError)) {
                error = new Error(maybeError.message || maybeError.errorMessage);
                error.name = maybeError.name || maybeError.errorClass;
                internalFrames += 1;
            } else {
                // unsupported error
                return;
            }
            break;
        default:
        // unsupported errors found
    }

    return [error, internalFrames];
}

const hasNecessaryFields = (error: any): boolean =>
    (typeof error.name === 'string' || typeof error.errorClass === 'string') &&
    (typeof error.message === 'string' || typeof error.errorMessage === 'string');

function isError(value: any): boolean {
    switch (Object.prototype.toString.call(value)) {
        case '[object Error]':
            return true;
        case '[object Exception]':
            return true;
        case '[object DOMException]':
            return true;
        default:
            return value instanceof Error;
    }
}

function buildError(err: Error): ATError {
    const errType = err.constructor.name;

    const rootError = rootCause(err);
    const rootErrorType = rootError.constructor.name;

    return {
        when: new Date().toISOString(),
        error_type: errType,
        message: err.message,
        root_error_type: rootErrorType,
        root_error_message: rootError.message,
        stack_trace: err.stack ?? '',
    };
}




