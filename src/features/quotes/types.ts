export type QuoteCategory = { id: string; name: string; color: string; dashboardEnabled: boolean; createdAt: string }
export type Quote = { id: string; categoryId: string | null; category: QuoteCategory | null; body: string; author: string | null; source: string | null; isActive: boolean; isFavorite: boolean; createdAt: string }
export type QuoteInput = Pick<Quote, 'categoryId' | 'body' | 'author' | 'source' | 'isActive' | 'isFavorite'>
