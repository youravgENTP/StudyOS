import { neonClient } from './client'

// Features use this boundary instead of initializing Neon clients. The
// integrated client attaches the current Neon Auth JWT to every query.
export const dataApi = neonClient
