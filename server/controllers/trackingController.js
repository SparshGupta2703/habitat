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
  const start = new Date(`${date}T00:00:00`); const end = new Date(`${date}T23:59:59.999`)
  const entries = await repo.listFood(req.id, start.toISOString(), end.toISOString())
  if (!entries.length) throw Object.assign(new Error('Add food entries for this day before analysing macros.'), { status: 400 })
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: `Estimate nutrition for these foods. Return only JSON with items array (name, quantity, calories, protein, carbohydrates, fats) and totals object (calories, protein, carbohydrates, fats). Values must be finite non-negative numbers. Foods: ${entries.map((entry) => entry.text).join('; ')}` }] }], generationConfig: { responseMimeType: 'application/json' } }) })
  if (!response.ok) throw Object.assign(new Error('Nutrition analysis could not be completed.'), { status: 502 })
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
  const end = new Date(); end.setHours(23, 59, 59, 999)
  const start = new Date(); start.setDate(start.getDate() - days + 1); start.setHours(0, 0, 0, 0)
  const [sleep, food, habits, logs] = await Promise.all([repo.listSleep(req.id, start.toISOString(), end.toISOString()), repo.listFood(req.id, start.toISOString(), end.toISOString()), repo.listHabits(req.id), repo.listHabitLogs(req.id, start.toISOString().slice(0, 10), end.toISOString().slice(0, 10))])
  const byDay = new Map()
  for (let i = 0; i < days; i++) { const day = new Date(start); day.setDate(start.getDate() + i); byDay.set(day.toISOString().slice(0, 10), { date: day.toISOString().slice(0, 10), sleepHours: 0, calories: 0, protein: 0, carbohydrates: 0, fats: 0, habitsCompleted: 0, habitsTotal: habits.length }) }
  sleep.forEach((session) => { if (session.bedtime && session.wakeTime) { const key = new Date(session.wakeTime).toISOString().slice(0, 10); const row = byDay.get(key); if (row) row.sleepHours += Math.max(0, (new Date(session.wakeTime) - new Date(session.bedtime)) / 3600000) } })
  food.forEach((entry) => { const row = byDay.get(new Date(entry.eatenAt).toISOString().slice(0, 10)); if (row && entry.analysis) ['calories', 'protein', 'carbohydrates', 'fats'].forEach((key) => { row[key] += entry.analysis[key] || 0 }) })
  logs.forEach((entry) => { const row = byDay.get(entry.date); if (row) row.habitsCompleted++ })
  const series = [...byDay.values()].map((row) => ({ ...row, sleepHours: Math.round(row.sleepHours * 10) / 10, habitRate: row.habitsTotal ? Math.round(row.habitsCompleted / row.habitsTotal * 100) : 0 }))
  return { days, series, habits: habits.map((habit) => ({ id: habit._id, name: habit.name, trackTimestamp: habit.trackTimestamp, trackQuantity: habit.trackQuantity, quantityType: habit.quantityType, quantityUnit: habit.quantityUnit, history: series.map((day) => { const log = logs.find((entry) => String(entry.habitId) === String(habit._id) && entry.date === day.date); return { date: day.date, completed: Boolean(log), quantity: log?.quantityValue ?? (log ? 1 : 0), timestamp: log?.timestamp || null } }) })) }
})
