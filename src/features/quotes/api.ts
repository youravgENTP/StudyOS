import { dataApi } from '../../lib/neon/data'
import type { Quote, QuoteCategory, QuoteInput } from './types'

const CHANGED = 'studyos:quotes-changed'
const notify = () => window.dispatchEvent(new Event(CHANGED))
export function onQuotesChanged(listener: () => void) { window.addEventListener(CHANGED, listener); return () => window.removeEventListener(CHANGED, listener) }
const failure = (error: unknown) => new Error(error && typeof error === 'object' && 'message' in error ? String(error.message) : 'Quote request failed')

function mapCategory(row: Record<string, unknown>): QuoteCategory { return { id: String(row.id), name: String(row.name), color: String(row.color), dashboardEnabled: Boolean(row.dashboard_enabled), createdAt: String(row.created_at) } }
function mapQuote(row: Record<string, unknown>): Quote {
  const relation = Array.isArray(row.quote_categories) ? row.quote_categories[0] : row.quote_categories
  return { id: String(row.id), categoryId: row.category_id ? String(row.category_id) : null, category: relation ? mapCategory(relation as Record<string, unknown>) : null, body: String(row.body), author: row.author ? String(row.author) : null, source: row.source ? String(row.source) : null, isActive: Boolean(row.is_active), isFavorite: Boolean(row.is_favorite), createdAt: String(row.created_at) }
}

export async function listQuoteCategories() { const { data, error } = await dataApi.from('quote_categories').select('id,name,color,dashboard_enabled,created_at').order('name'); if (error) throw failure(error); return (data ?? []).map(row => mapCategory(row as Record<string, unknown>)) }
export async function createQuoteCategory(name: string, color: string) { const { error } = await dataApi.from('quote_categories').insert({ name: name.trim(), color }); if (error) throw failure(error); notify() }
export async function updateQuoteCategory(id: string, input: Pick<QuoteCategory, 'name' | 'color' | 'dashboardEnabled'>) { const { error } = await dataApi.from('quote_categories').update({ name: input.name.trim(), color: input.color, dashboard_enabled: input.dashboardEnabled }).eq('id', id); if (error) throw failure(error); notify() }
export async function deleteQuoteCategory(id: string) { const { error } = await dataApi.from('quote_categories').delete().eq('id', id); if (error) throw failure(error); notify() }

const quoteSelection = 'id,category_id,body,author,source,is_active,is_favorite,created_at,quote_categories(id,name,color,dashboard_enabled,created_at)'
export async function listQuotes() { const { data, error } = await dataApi.from('quotes').select(quoteSelection).order('created_at', { ascending: false }); if (error) throw failure(error); return (data ?? []).map(row => mapQuote(row as Record<string, unknown>)) }
const quoteValues = (input: QuoteInput) => ({ category_id: input.categoryId, body: input.body.trim(), author: input.author?.trim() || null, source: input.source?.trim() || null, is_active: input.isActive, is_favorite: input.isFavorite })
export async function createQuote(input: QuoteInput) { const { error } = await dataApi.from('quotes').insert(quoteValues(input)); if (error) throw failure(error); notify() }
export async function updateQuote(id: string, input: QuoteInput) { const { error } = await dataApi.from('quotes').update(quoteValues(input)).eq('id', id); if (error) throw failure(error); notify() }
export async function deleteQuote(id: string) { const { error } = await dataApi.from('quotes').delete().eq('id', id); if (error) throw failure(error); notify() }
