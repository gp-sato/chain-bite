import { describe, expect, it, vi } from 'vitest'
import {
  HttpError,
  fetchWithRetry,
  shouldRetryFetchError,
} from '../http'

describe('HTTP retry policy', () => {
  it('retries rate limits and succeeds when the next attempt succeeds', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('busy', { status: 429 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }))

    const response = await fetchWithRetry('https://example.com/items', {
      fetchImpl: fetchImpl as typeof fetch,
      maxRetries: 1,
      timeoutMs: 100,
    })

    expect(response.status).toBe(200)
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry permanent client errors', () => {
    expect(shouldRetryFetchError(new HttpError('not found', 404))).toBe(false)
    expect(shouldRetryFetchError(new HttpError('server error', 503))).toBe(true)
  })
})
