import test from 'node:test'
import assert from 'node:assert/strict'
import { requestProvider } from '../services/ai/providerRequest.js'

test('provider retries temporary rate limits once and then succeeds', async () => {
  const originalFetch = globalThis.fetch
  let attempts = 0
  globalThis.fetch = async () => {
    attempts++
    return attempts === 1
      ? new Response(JSON.stringify({ error: { message: 'slow down' } }), { status: 429, headers: { 'retry-after': '0' } })
      : new Response('{}', { status: 200 })
  }
  try {
    const response = await requestProvider('https://provider.invalid', {}, 'test')
    assert.equal(response.status, 200)
    assert.equal(attempts, 2)
  } finally { globalThis.fetch = originalFetch }
})

test('provider rejects invalid credentials without retrying or exposing response details', async () => {
  const originalFetch = globalThis.fetch
  let attempts = 0
  globalThis.fetch = async () => { attempts++; return new Response(JSON.stringify({ error: { message: 'private upstream response' } }), { status: 401 }) }
  try {
    await assert.rejects(requestProvider('https://provider.invalid', {}, 'test'), (error) => {
      assert.equal(error.kind, 'credentials')
      assert.equal(error.message.includes('private upstream response'), false)
      return true
    })
    assert.equal(attempts, 1)
  } finally { globalThis.fetch = originalFetch }
})
