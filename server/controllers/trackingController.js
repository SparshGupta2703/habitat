import * as service from '../services/trackingService.js'
import * as repo from '../repositories/trackingRepository.js'

const run = (handler, status = 200) => async (req, res, next) => {
  try { res.status(status).json({ success: true, data: await handler(req) }) } catch (error) { next(error) }
}
export const listSleep = run((req) => service.getSleep(req.id, req.query))
export const createSleep = run((req) => service.addSleep(req.id, req.body), 201)
export const editSleep = run((req) => service.editSleep(req.id, req.params.id, req.body))
export const deleteSleep = run((req) => service.remove(repo.deleteSleep(req.id, req.params.id)))
export const listFood = run((req) => service.getFood(req.id, req.query))
export const createFood = run((req) => service.addFood(req.id, req.body), 201)
export const editFood = run((req) => service.editFood(req.id, req.params.id, req.body))
export const deleteFood = run((req) => service.remove(repo.deleteFood(req.id, req.params.id)))
export const listHabits = run((req) => service.getHabits(req.id, req.query.archived === 'true'))
export const createHabit = run((req) => service.addHabit(req.id, req.body), 201)
export const editHabit = run((req) => service.editHabit(req.id, req.params.id, req.body))
export const deleteHabit = run((req) => service.remove(repo.deleteHabit(req.id, req.params.id)))
export const habitHistory = run((req) => service.getHabitHistory(req.id, req.query))
export const setHabitLog = run((req) => service.logHabit(req.id, req.params.id, req.body))

export const analyzeFood = run(async (req) => {
  if (!process.env.GEMINI_API_KEY) throw Object.assign(new Error('Macro analysis is unavailable until GEMINI_API_KEY is configured in server/.env.'), { status: 503 })
  const date = req.body.date || new Date().toISOString().slice(0, 10)
  const timezoneOffset = Number.isFinite(Number(req.body.timezoneOffset)) ? Math.max(-840, Math.min(840, Number(req.body.timezoneOffset))) : 0
  const start = new Date(Date.parse(`${date}T00:00:00.000Z`) + timezoneOffset * 60000); const end = new Date(start.getTime() + 86400000 - 1)
  const entries = await repo.listFood(req.id, start.toISOString(), end.toISOString())
  if (!entries.length) throw Object.assign(new Error('Add food entries for this day before analysing macros.'), { status: 400 })
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Estimate nutrition for these foods. Return only JSON with items array (name, quantity, calories, protein, carbohydrates, fats) and totals object (calories, protein, carbohydrates, fats). Values must be finite non-negative numbers. Foods: ${entries.map((entry) => entry.text).join('; ')}` }] }], generationConfig: { responseMimeType: 'application/json' } }) })
  if (!response.ok) {
    const providerBody = await response.json().catch(() => ({}))
    const providerMessage = providerBody.error?.message || `The nutrition provider returned HTTP ${response.status}.`
    console.error(`Gemini nutrition request failed (${response.status}): ${providerMessage}`)
    throw Object.assign(new Error(`Gemini could not analyse this food: ${providerMessage}`), { status: 502 })
  }
  const raw = await response.json()
  let analysis
  try { analysis = JSON.parse(raw.candidates?.[0]?.content?.parts?.[0]?.text || '') } catch { throw Object.assign(new Error('Nutrition service returned invalid data.'), { status: 502 }) }
  const totals = analysis?.totals
  const keys = ['calories', 'protein', 'carbohydrates', 'fats']
  if (!Array.isArray(analysis.items) || !totals || keys.some((key) => !Number.isFinite(totals[key]) || totals[key] < 0) || analysis.items.some((item) => keys.some((key) => !Number.isFinite(item[key]) || item[key] < 0))) throw Object.assign(new Error('Nutrition service returned invalid values.'), { status: 502 })
  // Store the daily aggregate on one row so the Insights totals remain available
  // when a day contains more than one food entry.
  if (entries.length) await repo.saveFoodAnalysis(req.id, entries[0]._id, { ...totals, items: analysis.items })
  return { ...analysis, date, savedToEntry: entries.length > 0 }
})

export const analytics = run(async (req) => {
  const days = Math.min(3650, Math.max(1, Number(req.query.days) || 365))
  const timezoneOffset = Number.isFinite(Number(req.query.timezoneOffset)) ? Math.max(-840, Math.min(840, Number(req.query.timezoneOffset))) : 0
  const endDayKey = new Date(Date.now() - timezoneOffset * 60000).toISOString().slice(0, 10)
  const endLocalMidnight = Date.parse(`${endDayKey}T00:00:00.000Z`)
  const startLocalMidnight = endLocalMidnight - (days - 1) * 86400000
  const start = new Date(startLocalMidnight + timezoneOffset * 60000)
  const end = new Date(endLocalMidnight + timezoneOffset * 60000 + 86400000 - 1)
  const startDayKey = new Date(startLocalMidnight).toISOString().slice(0, 10)
  const endDateKey = new Date(endLocalMidnight).toISOString().slice(0, 10)
  const [sleep, food, habits, logs] = await Promise.all([repo.listSleep(req.id, start.toISOString(), end.toISOString()), repo.listFood(req.id, start.toISOString(), end.toISOString()), repo.listHabits(req.id), repo.listHabitLogs(req.id, startDayKey, endDateKey)])
  const byDay = new Map()
  for (let i = 0; i < days; i++) { const day = new Date(startLocalMidnight + i * 86400000).toISOString().slice(0, 10); byDay.set(day, { date: day, sleepHours: 0, calories: 0, protein: 0, carbohydrates: 0, fats: 0, habitsCompleted: 0, habitsTotal: habits.length }) }
  const localDateKey = (value) => new Date(new Date(value).getTime() - timezoneOffset * 60000).toISOString().slice(0, 10)
  sleep.forEach((session) => { if (session.bedtime && session.wakeTime) { const key = localDateKey(session.wakeTime); const row = byDay.get(key); if (row) row.sleepHours += Math.max(0, (new Date(session.wakeTime) - new Date(session.bedtime)) / 3600000) } })
  food.forEach((entry) => { const row = byDay.get(localDateKey(entry.eatenAt)); if (row && entry.analysis) ['calories', 'protein', 'carbohydrates', 'fats'].forEach((key) => { row[key] += entry.analysis[key] || 0 }) })
  logs.forEach((entry) => { const row = byDay.get(entry.date); if (row) row.habitsCompleted++ })
  const series = [...byDay.values()].map((row) => ({ ...row, sleepHours: Math.round(row.sleepHours * 10) / 10, habitRate: row.habitsTotal ? Math.round(row.habitsCompleted / row.habitsTotal * 100) : 0 }))
  return { days, series, habits: habits.map((habit) => ({ id: habit._id, name: habit.name, trackTimestamp: habit.trackTimestamp, trackQuantity: habit.trackQuantity, quantityType: habit.quantityType, quantityUnit: habit.quantityUnit, history: series.map((day) => { const log = logs.find((entry) => String(entry.habitId) === String(habit._id) && entry.date === day.date); return { date: day.date, completed: Boolean(log), quantity: log?.quantityValue ?? (log ? 1 : 0), timestamp: log?.timestamp || null } }) })) }
})
