The Adocasts package `apitoolkit-adonis` has been successfully configured. Before you begin, please register the below named middleware inside your `start/kernel.ts` file.
```ts
Server.middleware.registerNamed({
  honeypot: () => import('@ioc:APIToolkit') // 👈
})
```