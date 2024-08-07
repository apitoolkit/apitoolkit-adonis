<div align="center">

![APItoolkit's Logo](https://github.com/apitoolkit/.github/blob/main/images/logo-white.svg?raw=true#gh-dark-mode-only)
![APItoolkit's Logo](https://github.com/apitoolkit/.github/blob/main/images/logo-black.svg?raw=true#gh-light-mode-only)

## AdonisJS SDK

[![APItoolkit SDK](https://img.shields.io/badge/APItoolkit-SDK-0068ff?logo=adonisjs)](https://github.com/topics/apitoolkit-sdk) [![](https://img.shields.io/npm/v/apitoolkit-adonis.svg?logo=npm)](https://npmjs.com/package/apitoolkit-adonis) [![](https://img.shields.io/npm/dw/apitoolkit-adonis
)](https://npmjs.com/package/apitoolkit-adonis) [![Join Discord Server](https://img.shields.io/badge/Chat-Discord-7289da)](https://apitoolkit.io/discord?utm_campaign=devrel&utm_medium=github&utm_source=sdks_readme) [![APItoolkit Docs](https://img.shields.io/badge/Read-Docs-0068ff)](https://apitoolkit.io/docs/sdks/nodejs/adonisjs?utm_campaign=devrel&utm_medium=github&utm_source=sdks_readme) 

APItoolkit is an end-to-end API and web services management toolkit for engineers and customer support teams. To integrate your AdonisJS application with APItoolkit, you need to use this SDK to monitor incoming traffic, aggregate the requests, and then deliver them to the APItoolkit's servers.

</div>

---

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Contributing and Help](#contributing-and-help)
- [License](#license)

---

## Installation

Kindly run the command below to install the SDK:

```sh
npm install apitoolkit-adonis@latest
```

## Configuration

Next, run the command below to configure the SDK using ace:

```sh
node ace configure apitoolkit-adonis
```

Then, register the middleware by adding the `apitoolkit-adonis` client to your global middleware list in the `start/kernel.js|ts` file like so:

```js
import server from "@adonisjs/core/services/server"
import APIToolkit from "apitoolkit-adonis"

const client = new APIToolkit();

server.use([
  () => import("#middleware/container_bindings_middleware"),
  () => import("#middleware/force_json_response_middleware"),
  () => import("@adonisjs/cors/cors_middleware"),
  () => client.middleware(),
])
```

Then, create an `apitoolkit.js|ts` file in the `/conf` directory and export the `defineConfig` object with some properties like so:

```js
import { defineConfig } from 'apitoolkit-adonis'

export default defineConfig({
  apiKey: "{ENTER_YOUR_API_KEY_HERE}",
  debug: false,
  tags: ["environment: production", "region: us-east-1"],
  serviceVersion: "v2.0",
});
```

> [!NOTE]
> 
> The `{ENTER_YOUR_API_KEY_HERE}` demo string should be replaced with the [API key](https://apitoolkit.io/docs/dashboard/settings-pages/api-keys?utm_campaign=devrel&utm_medium=github&utm_source=sdks_readme) generated from the APItoolkit dashboard.

<br />

> [!IMPORTANT]
> 
> To learn more configuration options (redacting fields, error reporting, outgoing requests, etc.), please read this [SDK documentation](https://apitoolkit.io/docs/sdks/nodejs/adonisjs?utm_campaign=devrel&utm_medium=github&utm_source=sdks_readme).

## Contributing and Help

To contribute to the development of this SDK or request help from the community and our team, kindly do any of the following:
- Read our [Contributors Guide](https://github.com/apitoolkit/.github/blob/main/CONTRIBUTING.md).
- Join our community [Discord Server](https://apitoolkit.io/discord?utm_campaign=devrel&utm_medium=github&utm_source=sdks_readme).
- Create a [new issue](https://github.com/apitoolkit/apitoolkit-adonis/issues/new/choose) in this repository.

## License

This repository is published under the [MIT](LICENSE) license.

---

<div align="center">
    
<a href="https://apitoolkit.io?utm_campaign=devrel&utm_medium=github&utm_source=sdks_readme" target="_blank" rel="noopener noreferrer"><img src="https://github.com/apitoolkit/.github/blob/main/images/icon.png?raw=true" width="40" /></a>

</div>
