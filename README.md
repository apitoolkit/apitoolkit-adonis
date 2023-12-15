<p>
<img src="https://apitoolkit.io/assets/img/logo-full.svg" alt="APIToolkit" width="250px" />
</p>

# APIToolkit Adonisjs integration.

The Adonisjs SDK integration guide for APIToolkit. It monitors incoming traffic, gathers the requests, and sends the request to the API toolkit servers.

## Installation

Run the following command to install the package from your projects root:

```sh
npm install apitoolkit-adonis

# configure apitoolkit for your adonis project
node ace configure apitoolkit-adonis
```

Edit `start/kernel.ts` to add `@ioc:APIToolkit` to your global middlewares list

```js

Server.middleware.register([
    () => import('@ioc:Adonis/Core/BodyParser'),
    () => import("@ioc:APIToolkit")
])

```

### Configuration

To configure the sdk first create an `apitoolkit.ts` file in the `/config` directory
and export a `apitoolkitConfig` object with the following properties

- *apiKey*: `required` This API key can be generated from your [APIToolkit acount](https://app.apitoolkit.io)
- *redactHeaders*: `optional` This is an array of request and response headers that should be omited by APIToolkit
- *redactRequestBody*: `optional` An array of request body keypaths to be redacted (i.e should not leave your servers)
- *redactResponseBody*: `optional` An array of reponse body keypaths to be redacted
- *serviceVersion*: `optional` A string service version to help you monitor different versions of your deployments
- *tags*: `optional` An array of tags to be associated with a request
- *debug*: `optional` A boolean to enable debug mode (ie print debug information)
- *disable*: `optional` A boolean to disable the sdk by setting it to `true`.


```js
export const apitoolkitConfig = {
    apiKey: "<YOUR_API_KEY>",
}
```
After configuring the sdk, all incoming request will now be send to APIToolkit.


### Redacting Senstive Fields and Headers

While it's possible to mark a field as redacted from the apitoolkit dashboard, this client also supports redacting at the client side. Client side redacting means that those fields would never leave your servers at all. So you feel safer that your sensitive data only stays on your servers.

To mark fields that should be redacted, simply add them to the `conf/apitoolkit.ts` default export object. Eg:

```js
export const apitoolkitConfig = {
    apiKey: "<YOUR_API_KEY>",
    redactHeaders: ["Content-Type", "Authorization", "Cookies"], // Specified headers will be redacted
    redactRequestBody: ["$.credit-card.cvv", "$.credit-card.name"], // Specified request bodies fields will be redacted
    redactResponseBody: ["$.message.error"], // Specified response body fields will be redacted
}
```

It is important to note that while the `redactHeaders` config field accepts a list of headers(case insensitive), the `redactRequestBody` and `redactResponseBody` expect a list of JSONPath strings as arguments.

The choice of JSONPath was selected to allow you have great flexibility in descibing which fields within your responses are sensitive. Also note that these list of items to be redacted will be aplied to all endpoint requests and responses on your server. To learn more about jsonpath to help form your queries, please take a look at this cheatsheet: https://lzone.de/cheat-sheet/JSONPath


## Using apitoolkit to observe an axios based outgoing request

To monitor outgoing request, you need to first enable asyncLocalStorage in your adonisjs project.
by setting `useAsyncLocalStorage` to true in your `config/app.ts` file.
```ts
export const http: ServerConfig = {
  useAsyncLocalStorage: true
  // other configs
}
```

After setting `asyncLocalStorage` to true, simply wrap your axios instance with the APIToolkit observeAxios function.

```typescript
import Route from '@ioc:Adonis/Core/Route'
import { observeAxios } from "apitoolkit-adonis"
import axios from "axios"


Route.get('/observer', async () => {
    const response = await observeAxios(axios).get(`${baseURL}/user_list/active`);
    return response.data;
}
```

If you're making requests to endpoints which have variable urlPaths, you should include a wildcard url of the path, so that apitoolkit groups the endpoints correctly for you on the dashboard:

```typescript
import Route from '@ioc:Adonis/Core/Route'
import { observeAxios } from "apitoolkit-adonis";
import axios from "axios"

Route.get('/observer', async () => {
    const response = await observeAxios(axios, "/users/{user_id}").get(
      `${baseURL}/users/user1234`,
    );
    return response.data;
}

```

There are other optional arguments you could pass on to the observeAxios function, eg:

```typescript
import Route from '@ioc:Adonis/Core/Route'
import axios from "axios"
import { observeAxios } from "apitoolkit-adonis";

const redactHeadersList = ["Content-Type", "Authorization"];
const redactRequestBodyList = ["$.body.user.password"];
const redactResponseBodyList = undefined;

Route.get('/observer', async () => {
    const response = await observeAxios(
      axios,
      "/users/{user_id}",
      redactHeadersList,
      redactRequestBodyList,
      redactResponseBodyList,
    ).get(`${baseURL}/users/user1234`);
    
    return {hello: "world"}
})
```

Note that you can ignore any of these arguments except the first argument which is the axios instance to observe.
For the other arguments, you can either skip them if at the end, or use undefined as a placeholder.

## Reporting errors to APIToolkit

APIToolkit detects a lot of API issues automatically, but it's also valuable to report and track errors. This helps you associate more details about the backend with a given failing request.
If you've used sentry, or rollback, or bugsnag, then you're likely aware of this functionality.

To report errors, you need to first enable asyncLocalStorage in your adonisjs project.
by setting `useAsyncLocalStorage` to true in your `config/app.ts` file.
```ts
export const http: ServerConfig = {
  useAsyncLocalStorage: true
  // other configs
}
```
You can then start reporting errors by calling the apitoolkit `reportError` function.

```typescript
import Route from '@ioc:Adonis/Core/Route'
import { reportError } from "apitoolkit-adonis";

Route.get('/observer', async () => {
  try {
    throw ("Error occured")
  } catch (error) {
    reportError(error)
  }
  return { hello: 'world' }
})
```