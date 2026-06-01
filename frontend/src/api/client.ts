// Laisse un fallback robuste pour éviter "Failed to fetch" si VITE_API_BASE n'est pas défini
const API_BASE = (import.meta as any).env?.VITE_API_BASE || (import.meta as any).env?.VITE_API_URL || 'http://127.0.0.1:5000'



export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const isFormData = opts.body instanceof FormData
  const headers: Record<string, string> = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(opts.headers as any),
  }

  const token = localStorage.getItem('token')
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers })
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

