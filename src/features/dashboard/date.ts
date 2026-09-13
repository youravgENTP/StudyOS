export const ddayLabel = (dueDate: string) => {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const days = Math.round((new Date(`${dueDate}T00:00:00`).getTime() - today.getTime()) / 86_400_000)
  return days === 0 ? 'D-Day' : days > 0 ? `D-${days}` : `D+${Math.abs(days)}`
}
