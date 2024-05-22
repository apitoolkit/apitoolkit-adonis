/// <reference path="../adonis-typings/apitoolkit.ts" />
/// <reference path="../adonis-typings/index.ts" />

import "reflect-metadata";
import supertest from "supertest";
import { test } from "@japa/runner";
import { createServer } from "http";
// import { RequestConstructorContract } from "@ioc:Adonis/Core/Request";
// import { Request as BaseRequest } from "@adonisjs/http-server/build/src/Request";

import { ApplicationContract } from "@ioc:Adonis/Core/Application";

import { APIToolkitMiddleware } from "../src/Middleware/APIToolkitMiddleware";
import { setupApp, fs } from "../test-helpers";
import { Payload } from "../src/payload";

// const _Request = BaseRequest as unknown as RequestConstructorContract
let app: ApplicationContract;

test.group("APIToolkitMiddleware Test", (group) => {
  group.each.setup(async () => {
    app = await setupApp();
    return async () => await fs.cleanup();
  });

  test("Post request body", async ({ assert }: any) => {
    let published = false;
    const server = createServer(async (req, res) => {
      const ctx = app.container
        .use("Adonis/Core/HttpContext")
        .create("/:slug/test", {}, req, res);
      app.container.use("Adonis/Core/BodyParser");
      const middleware = new APIToolkitMiddleware(app);
      middleware.publishMessage = (payload: Payload) => {
        assert.equal(payload.status_code, 200);
        assert.deepEqual(payload.response_headers, {
          "content-type": "application/json",
        });
        assert.deepEqual(payload.response_body, { username: "virk" });
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
        assert.equal(
          payload.response_body,
          Buffer.from(JSON.stringify(exampleDataRedacted)).toString("base64")
        );
        assert.equal(
          payload.request_body,
          Buffer.from(JSON.stringify(exampleRequestData)).toString("base64")
        );
        published = true;
      };

      await middleware.handle(ctx, async () => {
        res.writeHead(200, { "content-type": "application/json" });
        res.setHeader("X-API-KEY", "applicationKey");
        res.setHeader("X-SECRET", "secret value");
        res.end(JSON.stringify(exampleResponseData));
      });
    });
    const response = await supertest(server)
      .post("/slug-value/test")
      .set("Content-Type", "application/json")
      .set("X-API-KEY", "past-3")
      .send(exampleRequestData);
    assert.equal(response.status, 200);
    assert.equal(response.body.status, "success");
    assert.equal(published, true);
  });

  test("Should get data", async ({ assert }: any) => {
    let published = false;

    const server = createServer(async (req, res) => {
      const ctx = app.container
        .use("Adonis/Core/HttpContext")
        .create("/:slug/test", {}, req, res);
      app.container.use("Adonis/Core/BodyParser");
      const middleware = new APIToolkitMiddleware(app);
      middleware.publishMessage = (payload: Payload) => {
        assert.equal(payload.method, "GET");
        assert.deepEqual(payload.path_params, { slug: "slug-value" });
        assert.deepEqual(payload.query_params, {
          param1: ["abc"],
          param2: ["123"],
        });
        assert.equal(payload.status_code, 200);
        assert.equal(payload.sdk_type, "JsAdonis");
        assert.equal(payload.url_path, "/:slug/test");
        assert.equal(payload.raw_url, "/slug-value/test?param1=abc&param2=123");
        assert.isNotFalse(payload.duration > 500_000_000);
        assert.equal(
          payload.response_body,
          Buffer.from(JSON.stringify(exampleRequestData)).toString("base64")
        );
        published = true;
      };

      await middleware.handle(ctx, async () => {
        res.setHeader("X-API-KEY", "applicationKey");
        res.setHeader("X-SECRET", "secret value");
        setTimeout(() => {
          res.end(exampleRequestData);
        }, 500);
      });
    });

    const response = await supertest(server)
      .get("/slug-value/test?param1=abc&param2=123")
      .set("Content-Type", "application/json")
      .set("X-API-KEY", "past-3")
      .send(exampleRequestData);

    assert.equal(response.status, 200);
    assert.equal(
      JSON.stringify(response.body),
      JSON.stringify(exampleRequestData)
    );
    assert.equal(published, true);
  });
});

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

// const exampleDataRedaction = [
//   "$.status",
//   "$.data.account_data.account_type",
//   "$.data.account_data.possible_account_types",
//   "$.data.account_data.possible_account_types2[*]",
//   "$.non_existent",
// ];

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
