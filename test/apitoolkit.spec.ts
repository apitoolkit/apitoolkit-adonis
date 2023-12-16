/*
 * @adonisjs/bodyparser
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

/// <reference path="../adonis-typings/apitoolkit.ts" />
/// <reference path="../adonis-typings/index.ts" />

import 'reflect-metadata'
import supertest from 'supertest'
import { test } from '@japa/runner'
import { createServer } from 'http'
import { RequestConstructorContract } from '@ioc:Adonis/Core/Request'
import { Request as BaseRequest } from '@adonisjs/http-server/build/src/Request'

import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { APIToolkitMiddleware } from '../src/Middleware/APIToolkitMiddleware'
import { setupApp, fs } from '../test-helpers'
import { Payload } from "../src/payload"

const Request = BaseRequest as unknown as RequestConstructorContract
let app: ApplicationContract

test.group('APIToolkitMiddleware Test', (group) => {

    group.each.setup(async () => {
        app = await setupApp()
        return async () => await fs.cleanup()
    })

    test('Post request body', async ({ assert }: any) => {
        let published = false
        const server = createServer(async (req, res) => {
            const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
            app.container.use("Adonis/Core/BodyParser")
            const middleware = new APIToolkitMiddleware(app)
            middleware.publishMessage = (payload: Payload) => {
                published = true
                assert.equal(payload.status_code, 200)
                assert.deepEqual(payload.response_headers, { "content-type": "application/json" })
                assert.deepEqual(payload.response_body, { username: 'virk' })
                assert.equal(payload.method, "POST");
                assert.deepEqual(payload.path_params, { slug: "slug-value" });
                assert.equal(payload.sdk_type, "JsAdonis");
                assert.deepEqual(payload.request_headers, {
                    "accept-encoding": ["gzip, deflate"],
                    connection: ["close"],
                    "content-length": ["437"],
                    "content-type": ["application/json"],
                    "x-api-key": ["past-3"],
                });

                assert.deepEqual(payload.response_headers, {
                    "content-type": ["application/json; charset=utf-8"],
                    "x-secret": ["[CLIENT_REDACTED]"],
                    "x-api-key": ["applicationKey"],
                });

                assert.equal(payload.url_path, "/:slug/test");
                assert.equal(payload.raw_url, "/slug-value/test");
                assert.equal(payload.response_body,
                    Buffer.from(JSON.stringify(exampleDataRedacted)).toString("base64"));
                assert.equal(payload.request_body, Buffer.from(JSON.stringify(exampleRequestData)).toString("base64"));
                published = true;
            }

            await middleware.handle(ctx, async () => {
                res.writeHead(200, { 'content-type': 'application/json' })
                res.setHeader("X-API-KEY", "applicationKey");
                res.setHeader("X-SECRET", "secret value");
                res.end(JSON.stringify(exampleResponseData))
            })

        })
        const response = await supertest(server)
            .post("/slug-value/test")
            .set("Content-Type", "application/json")
            .set("X-API-KEY", "past-3")
            .send(exampleRequestData);
        assert.equal(response.status, 200);
        assert.equal(response.body.status, "success");
        assert.equal(published, true);

    })

    test('Post request body', async ({ assert }: any) => {
        let published = false
        const server = createServer(async (req, res) => {
            const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
            app.container.use("Adonis/Core/BodyParser")
            const middleware = new APIToolkitMiddleware(app)
            middleware.publishMessage = (payload: Payload) => {
                published = true
                assert.equal(payload.status_code, 200)
                assert.deepEqual(payload.response_headers, { "content-type": "application/json" })
                assert.deepEqual(payload.response_body, { username: 'virk' })
                assert.equal(payload.method, "POST");
                assert.deepEqual(payload.path_params, { slug: "slug-value" });
                assert.equal(payload.sdk_type, "JsAdonis");
                assert.deepEqual(payload.request_headers, {
                    "accept-encoding": ["gzip, deflate"],
                    connection: ["close"],
                    "content-length": ["437"],
                    "content-type": ["application/json"],
                    "x-api-key": ["past-3"],
                });

                assert.deepEqual(payload.response_headers, {
                    "content-type": ["application/json; charset=utf-8"],
                    "x-secret": ["[CLIENT_REDACTED]"],
                    "x-api-key": ["applicationKey"],
                });

                assert.equal(payload.url_path, "/:slug/test");
                assert.equal(payload.raw_url, "/slug-value/test");
                assert.equal(payload.response_body,
                    Buffer.from(JSON.stringify(exampleDataRedacted)).toString("base64"));
                assert.equal(payload.request_body, Buffer.from(JSON.stringify(exampleRequestData)).toString("base64"));
                published = true;
            }

            await middleware.handle(ctx, async () => {
                res.writeHead(200, { 'content-type': 'application/json' })
                res.setHeader("X-API-KEY", "applicationKey");
                res.setHeader("X-SECRET", "secret value");
                res.end(JSON.stringify(exampleResponseData))
            })

        })
        const response = await supertest(server)
            .post("/slug-value/test")
            .set("Content-Type", "application/json")
            .set("X-API-KEY", "past-3")
            .send(exampleRequestData);
        assert.equal(response.status, 200);
        assert.equal(response.body.status, "success");
        assert.equal(published, true);

    })


    //     test('by pass when body is empty', async ({ assert }) => {
    //         const server = createServer(async (req, res) => {
    //             const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
    //             const middleware = new BodyParserMiddleware(
    //                 app.container.use('Adonis/Core/Config'),
    //                 app.container.use('Adonis/Core/Drive')
    //             )

    //             await middleware.handle(ctx, async () => {
    //                 res.writeHead(200, { 'content-type': 'application/json' })
    //                 res.end(JSON.stringify(ctx.request.all()))
    //             })
    //         })

    //         const { body } = await supertest(server).post('/').type('json')

    //         assert.deepEqual(body, {})
    //     })

    //     test('by pass when content type is not supported', async ({ assert }) => {
    //         const server = createServer(async (req, res) => {
    //             const ctx = app.container.use('Adonis/Core/HttpContext').create('/', {}, req, res)
    //             const middleware = new BodyParserMiddleware(
    //                 app.container.use('Adonis/Core/Config'),
    //                 app.container.use('Adonis/Core/Drive')
    //             )

    //             await middleware.handle(ctx, async () => {
    //                 res.writeHead(200, { 'content-type': 'application/json' })
    //                 res.end(JSON.stringify(ctx.request.all()))
    //             })
    //         })

    //         const { body } = await supertest(server)
    //             .post('/')
    //             .set('content-type', 'my-type')
    //             .send(JSON.stringify({ username: 'virk' }))

    //         assert.deepEqual(body, {})
    //     })
})


const exampleResponseData = {
    status: "success",
    data: {
        message: "hello world",
        account_data: {
            batch_number: 12345,
            account_id: "123456789",
            account_name: "test account",
            account_type: "test",
            account_status: "active",
            account_balance: "100.00",
            account_currency: "USD",
            account_created_at: "2020-01-01T00:00:00Z",
            account_updated_at: "2020-01-01T00:00:00Z",
            account_deleted_at: "2020-01-01T00:00:00Z",
            possible_account_types: ["test", "staging", "production"],
            possible_account_types2: ["test", "staging", "production"],
        },
    },
};

const exampleDataRedaction = [
    "$.status",
    "$.data.account_data.account_type",
    "$.data.account_data.possible_account_types",
    "$.data.account_data.possible_account_types2[*]",
    "$.non_existent",
];

const exampleDataRedacted = {
    status: "[CLIENT_REDACTED]",
    data: {
        message: "hello world",
        account_data: {
            batch_number: 12345,
            account_id: "123456789",
            account_name: "test account",
            account_type: "[CLIENT_REDACTED]",
            account_status: "active",
            account_balance: "100.00",
            account_currency: "USD",
            account_created_at: "2020-01-01T00:00:00Z",
            account_updated_at: "2020-01-01T00:00:00Z",
            account_deleted_at: "2020-01-01T00:00:00Z",
            possible_account_types: "[CLIENT_REDACTED]",
            possible_account_types2: [
                "[CLIENT_REDACTED]",
                "[CLIENT_REDACTED]",
                "[CLIENT_REDACTED]",
            ],
        },
    },
};

const exampleRequestData = {
    status: "request",
    send: {
        message: "hello world",
        account_data: [
            {
                batch_number: 12345,
                account_id: "123456789",
                account_name: "test account",
                account_type: "test",
                account_status: "active",
                account_balance: "100.00",
                account_currency: "USD",
                account_created_at: "2020-01-01T00:00:00Z",
                account_updated_at: "2020-01-01T00:00:00Z",
                account_deleted_at: "2020-01-01T00:00:00Z",
                possible_account_types: ["test", "staging", "production"],
            },
        ],
    },
};
