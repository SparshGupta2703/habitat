function retryDelay(response, attempt) {
  const header = response?.headers?.get('retry-after')
  const parsed = header ? (/^\d+(\.\d+)?$/.test(header) ? Number(header) * 1000 : Date.parse(header) - Date.now()) : NaN
  const base = Number.isFinite(parsed) && parsed >= 0 ? parsed : (400 * (2 ** attempt) + Math.random() * 250)
  return Math.min(8000, Math.max(0, base))
}

export async function requestProvider(url, init, provider) {
  let lastError
  for (let attempt = 0; attempt < 2; attempt++) {
    let response
    try {
      response = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) })
    } catch {
      lastError = Object.assign(new Error('The nutrition provider could not be reached. Check the server network and try again.'), { status: 502, kind: 'network' })
      if (attempt === 0) { await new Promise((resolve) => setTimeout(resolve, 400 + Math.random() * 250)); continue }
      throw lastError
    }
    if (response.ok) return response
    const payload = await response.json().catch(() => ({}))
    const providerCode = String(payload.error?.code || payload.error?.type || '')
    const providerMessage = String(payload.error?.message || '')
    if (response.status === 429 && /quota|billing|exhaust/i.test(`${providerCode} ${providerMessage}`)) {
      throw Object.assign(new Error(`The selected ${provider} quota is exhausted. Choose another configured provider or check its plan.`), { status: 503, kind: 'quota' })
    }
    const retryable = response.status === 429 || response.status >= 500
    if (retryable && attempt === 0) { await new Promise((resolve) => setTimeout(resolve, retryDelay(response, attempt))); continue }
    if (response.status === 401 || response.status === 403) throw Object.assign(new Error(`The ${provider} server key is missing, invalid, or not permitted.`), { status: 503, kind: 'credentials' })
    if (response.status === 429) throw Object.assign(new Error(`The ${provider} service is temporarily rate limited. Please try again shortly.`), { status: 503, kind: 'rate-limit' })
    if (response.status >= 500) throw Object.assign(new Error(`The ${provider} service is temporarily unavailable. Please try again later.`), { status: 502, kind: 'provider' })
    console.error(`${provider} nutrition request rejected with HTTP ${response.status} (${providerCode || 'request_error'})`)
    throw Object.assign(new Error(`The ${provider} rejected the nutrition request. Check its server-side model configuration.`), { status: 502, kind: 'request' })
  }
  throw lastError || Object.assign(new Error('The nutrition provider is temporarily unavailable.'), { status: 502 })
}
