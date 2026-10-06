export const DEFAULT_HTTP_TIMEOUT_MS = 8_000

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (compatible; ChainBite/0.1; +https://github.com/gp-sato/chain-bite)'

export class HttpError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'HttpError'
    this.status = status
  }
}

export interface FetchWithRetryOptions extends RequestInit {
  timeoutMs?: number
  maxRetries?: number
  fetchImpl?: typeof fetch
}

/**
 * HTTPエラーを再試行してよいか判定します。
 *
 * 4xxの多くは入力やURLの恒久的な問題なので再試行せず、
 * timeout・429・5xxなど一時的な障害だけを再試行対象にします。
 */
export function shouldRetryFetchError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return error.status === 408 || error.status === 429 || error.status >= 500
  }

  if (!(error instanceof Error)) {
    return false
  }

  if (error.name === 'AbortError' || error.name === 'TimeoutError') {
    return true
  }

  const message = error.message.toLowerCase()
  return (
    error.name === 'TypeError' ||
    message.includes('network') ||
    message.includes('fetch') ||
    message.includes('terminated')
  )
}

/**
 * timeoutと限定的なretryを備えた、ブランド別アダプター共通のHTTP取得です。
 * Responseを返すため、HTML・JSON・XMLのどのアダプターからも利用できます。
 */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  options: FetchWithRetryOptions = {}
): Promise<Response> {
  const {
    timeoutMs = DEFAULT_HTTP_TIMEOUT_MS,
    maxRetries = 1,
    fetchImpl = fetch,
    signal: externalSignal,
    headers: requestHeaders,
    ...requestInit
  } = options

  const headers = new Headers(requestHeaders)
  if (!headers.has('user-agent')) {
    headers.set('user-agent', DEFAULT_USER_AGENT)
  }

  let lastError: unknown
  const attempts = Math.max(0, maxRetries) + 1

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
    const signal = externalSignal
      ? AbortSignal.any([externalSignal, controller.signal])
      : controller.signal

    try {
      const response = await fetchImpl(input, {
        ...requestInit,
        headers,
        cache: requestInit.cache ?? 'no-store',
        signal,
      })

      if (!response.ok) {
        throw new HttpError(
          `HTTP request failed with status ${response.status}: ${String(input)}`,
          response.status
        )
      }

      return response
    } catch (error) {
      lastError = error
      const canRetry = attempt < attempts - 1 && shouldRetryFetchError(error)
      if (!canRetry) {
        throw error
      }
    } finally {
      clearTimeout(timeoutId)
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError))
}
