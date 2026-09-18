const APP_ORIGIN = 'https://study-os-eosin.vercel.app'

export const config = { runtime: 'edge' }

export default async function handler(request) {
  const authBaseUrl = process.env.NEON_AUTH_BASE_URL
  if (!authBaseUrl) {
    return Response.json({ message: 'Authentication proxy is not configured.' }, { status: 500 })
  }

  const incomingUrl = new URL(request.url)
  const path = incomingUrl.searchParams.get('path') || ''
  if (!path || path.includes('..') || path.startsWith('/')) {
    return Response.json({ message: 'Invalid authentication path.' }, { status: 400 })
  }
  incomingUrl.searchParams.delete('path')

  const query = incomingUrl.searchParams.toString()
  const upstreamUrl = `${authBaseUrl.replace(/\/$/, '')}/${path}${query ? `?${query}` : ''}`
  const headers = new Headers(request.headers)
  for (const name of ['host', 'content-length', 'connection', 'accept-encoding', 'x-forwarded-host', 'x-forwarded-proto']) headers.delete(name)
  headers.set('origin', APP_ORIGIN)

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : await request.arrayBuffer()

  try {
    const upstream = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body,
      redirect: 'manual',
    })
    const responseHeaders = new Headers(upstream.headers)
    const cookie = responseHeaders.get('set-cookie')
    if (cookie) responseHeaders.set('set-cookie', cookie.replace(/;\s*Domain=[^;]+/gi, ''))
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('Authentication proxy request failed', error)
    return Response.json({ message: 'Authentication service is temporarily unavailable.' }, { status: 502 })
  }
}
