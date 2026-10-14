const DAY_MS = 24 * 60 * 60 * 1000

export function isDateKey(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T00:00:00.000Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export function normalizeTimeZone(timeZone) {
  if (!timeZone || typeof timeZone !== 'string') return 'UTC'
  try { new Intl.DateTimeFormat('en-US', { timeZone }).format() ; return timeZone } catch { return 'UTC' }
}

export function localDateKey(value, timeZone = 'UTC') {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: normalizeTimeZone(timeZone), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const part = Object.fromEntries(parts.map(({ type, value: item }) => [type, item]))
  return `${part.year}-${part.month}-${part.day}`
}

function zonedMidnight(dateKey, timeZone) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const target = Date.UTC(year, month - 1, day)
  let instant = target
  const formatter = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
  for (let attempt = 0; attempt < 4; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]))
    const represented = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    const adjustment = target - represented
    if (!adjustment) break
    instant += adjustment
  }
  return new Date(instant)
}

export function dateRangeForDays(days, timeZone = 'UTC', now = new Date()) {
  const zone = normalizeTimeZone(timeZone)
  const count = Math.max(1, Math.min(366, Math.trunc(Number(days) || 30)))
  const endDate = localDateKey(now, zone)
  const endUtc = new Date(`${endDate}T00:00:00.000Z`)
  const startDate = new Date(endUtc.getTime() - (count - 1) * DAY_MS).toISOString().slice(0, 10)
  const nextDate = new Date(endUtc.getTime() + DAY_MS).toISOString().slice(0, 10)
  const dates = Array.from({ length: count }, (_, index) => new Date(endUtc.getTime() - (count - 1 - index) * DAY_MS).toISOString().slice(0, 10))
  return { startDate, endDate, dates, start: zonedMidnight(startDate, zone), endExclusive: zonedMidnight(nextDate, zone), timeZone: zone }
}

export function dateRangeForDate(dateKey, timeZone = 'UTC') {
  if (!isDateKey(dateKey)) throw Object.assign(new Error('Use a valid date in YYYY-MM-DD format.'), { status: 400 })
  const zone = normalizeTimeZone(timeZone)
  const nextDate = new Date(new Date(`${dateKey}T00:00:00.000Z`).getTime() + DAY_MS).toISOString().slice(0, 10)
  return { start: zonedMidnight(dateKey, zone), endExclusive: zonedMidnight(nextDate, zone), timeZone: zone }
}
