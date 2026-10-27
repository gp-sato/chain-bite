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

  it('retries when reading the response body times out', async () => {
    let attempts = 0
    const fetchImpl = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      attempts += 1

      if (attempts > 1) {
        return new Response('ok', { status: 200 })
      }

      const signal = init?.signal
      return new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            const timer = setTimeout(() => {
              controller.enqueue(new TextEncoder().encode('too late'))
              controller.close()
            }, 50)

            signal?.addEventListener(
              'abort',
              () => {
                clearTimeout(timer)
                controller.error(new DOMException('The operation was aborted', 'AbortError'))
              },
              { once: true }
            )
          },
        })
      )
    })

    const body = await fetchWithRetry('https://example.com/items', {
      fetchImpl: fetchImpl as typeof fetch,
      maxRetries: 1,
      timeoutMs: 10,
      readResponse: (response) => response.text(),
    })

    expect(body).toBe('ok')
    expect(fetchImpl).toHaveBeenCalledTimes(2)
  })

  it('does not retry permanent client errors', () => {
    expect(shouldRetryFetchError(new HttpError('not found', 404))).toBe(false)
    expect(shouldRetryFetchError(new HttpError('server error', 503))).toBe(true)
  })
})
