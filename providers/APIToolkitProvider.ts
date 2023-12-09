import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class APIToolkitProvider {
    public static needsApplication = true

    constructor(protected app: ApplicationContract) { }

    public register() {
        // Register your own bindings
        this.app.container.singleton('APIToolkit', () => {
            const { APIToolkitMiddleware } = require('../src/Middleware/APIToolkitMiddleware')
            return APIToolkitMiddleware
        })
    }

    public async boot() {
        // IoC container is ready
    }
}