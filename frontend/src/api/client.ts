// Laisse un fallback robuste pour éviter "Failed to fetch" si VITE_API_BASE n'est pas défini
const configuredApiBase = ((import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || '').replace(/\/$/, '')
const isLocalApiBase = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(configuredApiBase)
const isBrowserOnLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname)
const browserUsesHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'
const safeConfiguredApiBase = browserUsesHttps && configuredApiBase.startsWith('http://') && !isLocalApiBase
  ? configuredApiBase.replace(/^http:\/\//i, 'https://')
  : configuredApiBase
const API_BASE = isLocalApiBase && !isBrowserOnLocalhost ? '' : safeConfiguredApiBase

export function getApiBase() {
  return API_BASE
}

function apiUrl(base: string, path: string) {
  return `${base}${path}`
}


export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isFormData = opts.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers as any),
  }

  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const primaryUrl = apiUrl(API_BASE, path)
  let res: Response
  try {
    res = await fetch(primaryUrl, { ...opts, headers })
  } catch (error) {
    if (API_BASE) {
      try {
        res = await fetch(apiUrl('', path), { ...opts, headers })
      } catch {
        throw new Error(`Impossible de joindre l'API (${primaryUrl}). Verifie VITE_API_BASE ou utilise le meme service Railway pour frontend + backend.`)
      }
    } else {
      throw new Error(`Impossible de joindre l'API (${primaryUrl}). Ouvre /api/health sur le meme domaine pour verifier le backend.`)
    }
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(text || `HTTP ${res.status}`)
  }
  return (await res.json()) as T
}

export async function uploadAdminFile(file: File): Promise<{ filename: string; url: string }> {
  const body = new FormData()
  body.append('file', file)
  return api<{ filename: string; url: string }>('/api/admin/uploads', {
    method: 'POST',
    body,
  })
}

export async function uploadFile(path: string, file: File): Promise<any> {
  const body = new FormData()
  body.append('file', file)
  return api<any>(path, {
    method: 'POST',
    body,
  })
}

