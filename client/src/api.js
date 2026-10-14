const localHost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname)
const defaultApi = localHost ? 'http://localhost:5000/api' : 'https://habitat-3qab.onrender.com/api'
export const API = (import.meta.env.VITE_API_URL || defaultApi).replace(/\/$/, '')

export async function request(path, token, options = {}) {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'Could not complete that request.')
  return result.data ?? result
}

export const browserTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
