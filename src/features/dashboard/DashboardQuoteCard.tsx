import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { listQuotes, onQuotesChanged } from '../quotes/api'
import type { Quote } from '../quotes/types'

const daySeed = () => Number(new Date().toLocaleDateString('en-CA').replaceAll('-', ''))

export function DashboardQuoteCard() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [offset, setOffset] = useState(0)
  const load = useCallback(async () => { try { setQuotes((await listQuotes()).filter(quote => quote.isActive && quote.category?.dashboardEnabled)) } catch { setQuotes([]) } }, [])
  useEffect(() => { void load(); return onQuotesChanged(() => void load()) }, [load])
  const quote = useMemo(() => quotes.length ? quotes[(daySeed() + offset) % quotes.length] : null, [offset, quotes])
  if (!quote) return <section className="card dashboard-quote-card"><div className="card-head"><h2>Today’s Quote</h2><Link className="meta" to="/quotes">Manage</Link></div><p className="meta">Add an active quote from a Dashboard-enabled category.</p></section>
  return <section className="card dashboard-quote-card" style={{ '--quote-color': quote.category?.color } as React.CSSProperties}><div className="card-head"><div><h2>Today’s Quote</h2><span className="dashboard-card-caption">{quote.category?.name}</span></div><div><button onClick={() => setOffset(value => value + 1)} aria-label="Show another quote"><RefreshCw /></button><Link className="meta" to="/quotes">Manage</Link></div></div><blockquote>“{quote.body}”</blockquote><p>{quote.author ? `— ${quote.author}` : 'Unknown author'}{quote.source ? ` · ${quote.source}` : ''}</p></section>
}
