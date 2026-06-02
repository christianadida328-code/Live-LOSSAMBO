export async function debugHealth(apiBase?: string) {
  const base = apiBase || (import.meta as any).env?.VITE_API_BASE || 'http://localhost:5000'
  const res = await fetch(`${base}/api/health`)
  return { status: res.status, text: await res.text() }
}

