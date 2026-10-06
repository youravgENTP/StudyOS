import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { listQuotes, onQuotesChanged } from '../quotes/api'
import { quoteDetails, randomQuote } from '../quotes/model'
import type { Quote } from '../quotes/types'

export function DashboardQuoteCard() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const load = useCallback(async () => { try { const eligible = (await listQuotes()).filter(quote => quote.isActive && quote.category?.dashboardEnabled); setQuotes(eligible); setSelectedId(current => eligible.some(quote => quote.id === current) ? current : randomQuote(eligible)?.id ?? null) } catch { setQuotes([]); setSelectedId(null) } }, [])
  useEffect(() => { void load(); return onQuotesChanged(() => void load()) }, [load])
  const quote = quotes.find(candidate => candidate.id === selectedId) ?? null
  if (!quote) return <section className="card dashboard-quote-card"><div className="card-head"><h2>Today’s Quote</h2><Link className="meta" to="/quotes">Manage</Link></div><p className="meta">Add an active quote from a Dashboard-enabled category.</p></section>
  return <section className="card dashboard-quote-card" style={{ '--quote-color': quote.category?.color } as React.CSSProperties}><div className="card-head"><div><h2>Today’s Quote</h2><span className="dashboard-card-caption">{quote.category?.name}</span></div><div><button onClick={() => setSelectedId(randomQuote(quotes, selectedId)?.id ?? null)} aria-label="Show another quote"><RefreshCw /></button><Link className="meta" to="/quotes">Manage</Link></div></div><blockquote>“{quote.body}”</blockquote><p>{quoteDetails(quote)}</p></section>
}
