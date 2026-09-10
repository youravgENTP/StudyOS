const HOUR = 3_600_000

function nextHalfHourBoundary(date: Date) {
  const boundary = new Date(date)
  const hasSubminute = boundary.getSeconds() !== 0 || boundary.getMilliseconds() !== 0
  boundary.setSeconds(0, 0)

  if ((boundary.getMinutes() === 0 || boundary.getMinutes() === 30) && !hasSubminute) return boundary
  if (boundary.getMinutes() < 30) {
    boundary.setMinutes(30)
    return boundary
  }

  boundary.setHours(boundary.getHours() + 1, 0, 0, 0)
  return boundary
}

export function alignedTimeTicks(start: Date, end: Date, intervalHours = 4) {
  const ticks: Date[] = []
  const interval = intervalHours * HOUR

  for (let time = nextHalfHourBoundary(start); time <= end; time = new Date(time.getTime() + interval)) {
    ticks.push(time)
  }

  return ticks
}
