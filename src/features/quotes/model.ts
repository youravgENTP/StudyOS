import type { Quote } from './types'

export function isWebtoonCategory(name: string | null | undefined) {
  const normalized = name?.trim().toLocaleLowerCase()
  return normalized === '웹툰' || normalized === 'webtoon'
}

export function quoteDetails(quote: Pick<Quote, 'author' | 'source' | 'episode'>) {
  const author = quote.author ? `— ${quote.author}` : 'Unknown author'
  const source = quote.source ? ` · ${quote.source}` : ''
  const episode = quote.episode ? ` · ${quote.episode}${quote.episode.endsWith('화') ? '' : '화'}` : ''
  return `${author}${source}${episode}`
}

export function randomQuote<T extends Pick<Quote, 'id'>>(quotes: T[], excludingId?: string | null): T | null {
  const pool = quotes.length > 1 && excludingId ? quotes.filter(quote => quote.id !== excludingId) : quotes
  if (!pool.length) return null

  // Rejection sampling avoids the small modulo bias introduced by directly
  // applying `% pool.length` to a random integer.
  const range = 0x1_0000_0000
  const limit = range - (range % pool.length)
  const sample = new Uint32Array(1)
  do crypto.getRandomValues(sample); while (sample[0] >= limit)
  return pool[sample[0] % pool.length]
}
