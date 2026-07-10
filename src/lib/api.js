// Thin fetch wrapper. Every request is credentialed so the JWT cookie
// travels cross-site (frontend on amberbroihier.com, API on App Runner).
// `credentials: 'include'` alone isn't enough — the API also has to
// send Access-Control-Allow-Credentials + a specific origin (it does).

const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let msg = `Request failed (${res.status})`
    try {
      const data = await res.json()
      if (data?.error) msg = data.error
    } catch {
      // response wasn't JSON; keep the generic message
    }
    const err = new Error(msg)
    err.status = res.status
    throw err
  }
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
  del: (path) => request('DELETE', path),
}
