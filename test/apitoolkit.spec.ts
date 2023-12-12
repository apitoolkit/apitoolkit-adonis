
import { test } from '@japa/runner'
import { APIToolkitMiddleware } from '../src/Middleware/APIToolkitMiddleware'
import { setup, fs } from '../test-helpers'

test.group('Test APIToolkitMiddleware', (group) => {
    group.each.teardown(async () => {
        await fs.cleanup()
    })

    test('register shield provider', async ({ client, assert }) => {
        const app = await setup()
        assert.deepEqual(app.container.use('APIToolkit'), APIToolkitMiddleware)
    })
})