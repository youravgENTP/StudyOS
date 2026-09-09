function requirePublicEndpoint(name: string, value: string): string {
  if (!value) throw new Error(`Missing browser endpoint configuration: ${name}`)
  const url = new URL(value)
  if (url.protocol !== 'https:' && url.hostname !== 'localhost') {
    throw new Error(`${name} must use HTTPS outside localhost`)
  }
  return url.toString().replace(/\/$/, '')
}

export const neonConfig = Object.freeze({
  authUrl: requirePublicEndpoint('VITE_NEON_AUTH_URL', import.meta.env.VITE_NEON_AUTH_URL),
  dataApiUrl: requirePublicEndpoint('VITE_NEON_DATA_API_URL', import.meta.env.VITE_NEON_DATA_API_URL),
})
