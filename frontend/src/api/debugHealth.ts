export async function debugHealth(apiBase?: string) {
  const configuredBase = (apiBase || (import.meta as any).env?.VITE_API_BASE || '').replace(/\/$/, '')
  const isLocalBase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredBase)
  const isBrowserOnLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
  const base = isLocalBase && !isBrowserOnLocalhost ? '' : configuredBase
  const res = await fetch(`${base}/api/health`)
  return { status: res.status, text: await res.text() }
}

