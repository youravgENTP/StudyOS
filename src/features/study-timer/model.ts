export function localMidnightBoundaries(startedAt: Date, now: Date) {
  if (Number.isNaN(startedAt.getTime()) || Number.isNaN(now.getTime()) || startedAt >= now) return []

  const cursor = new Date(startedAt)
  cursor.setHours(24, 0, 0, 0)
  const boundaries: Date[] = []
  while (cursor <= now) {
    boundaries.push(new Date(cursor))
    cursor.setDate(cursor.getDate() + 1)
  }
  return boundaries
}
