The apitoolkit package `apitoolkit-adonis` has been successfully configured. Before you begin, please register the middleware inside your `start/kernel.ts` file.

```ts
Server.middleware.register([
  () => import("@ioc:APIToolkit"), // 👈
]);
```
