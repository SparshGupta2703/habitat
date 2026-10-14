import * as service from '../services/trackingService.js'
import * as repo from '../repositories/trackingRepository.js'
import { analyzeNutrition } from '../services/ai/aiProviderService.js'
import { validateNutritionEntries } from '../services/ai/nutritionSchema.js'
import { dateRangeForDate, dateRangeForDays, localDateKey, normalizeTimeZone } from '../services/dateService.js'
import { buildDailyAnalytics } from '../services/analyticsService.js'

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
  const timeZone = normalizeTimeZone(req.body.timeZone)
  const date = req.body.date || localDateKey(new Date(), timeZone)
  const range = dateRangeForDate(date, timeZone)
  const allEntries = await repo.listFoodForDate(req.id, date, range.start, range.endExclusive)
  if (!allEntries.length) throw Object.assign(new Error('Add food entries for this day before analysing macros.'), { status: 400 })
  const requestedIds = Array.isArray(req.body.entryIds) ? new Set(req.body.entryIds.map(String)) : null
  const entries = allEntries.filter((entry) => (!requestedIds || requestedIds.has(String(entry._id))) && !(entry.analysis && (entry.analysisStatus === 'analyzed' || !entry.analysisStatus)))
  if (requestedIds && [...requestedIds].some((id) => !allEntries.some((entry) => String(entry._id) === id))) throw Object.assign(new Error('One or more selected food entries were not found for this date.'), { status: 404 })
  if (requestedIds && requestedIds.size !== entries.length && entries.length === 0 && !allEntries.some((entry) => requestedIds.has(String(entry._id)))) throw Object.assign(new Error('No food entries were selected for analysis.'), { status: 400 })
  let provider = null
  if (entries.length) {
    const input = entries.map((entry) => ({ entryId: String(entry._id), food: entry.text }))
    await repo.markFoodAnalysisPending(req.id, entries.map((entry) => entry._id))
    try {
      const response = await analyzeNutrition(input)
      provider = response.provider
      const issue = validateNutritionEntries(response.result, input.map((entry) => entry.entryId))
      if (issue) throw Object.assign(new Error('The nutrition provider returned incomplete or invalid data. The entries were kept; retry analysis.'), { status: 502, kind: 'invalid-response' })
      const byId = new Map(response.result.entries.map((item) => [item.entryId, item]))
      await Promise.all(entries.map((entry) => {
        const item = byId.get(String(entry._id))
        return repo.saveFoodAnalysis(req.id, entry._id, { name: item.name.trim(), quantity: item.quantity.trim(), ...Object.fromEntries(['calories', 'protein', 'carbohydrates', 'fats'].map((key) => [key, item[key]])) })
      }))
    } catch (error) {
      const publicError = error.message || 'Nutrition analysis failed. The food entries were kept; retry analysis.'
      await repo.markFoodAnalysisFailed(req.id, entries.map((entry) => entry._id), publicError.slice(0, 240))
      throw error
    }
  }
  const refreshed = await repo.listFoodForDate(req.id, date, range.start, range.endExclusive)
  const analyzed = refreshed.filter((entry) => entry.analysis && (entry.analysisStatus === 'analyzed' || !entry.analysisStatus))
  const keys = ['calories', 'protein', 'carbohydrates', 'fats']
  const totals = Object.fromEntries(keys.map((key) => [key, analyzed.reduce((sum, entry) => sum + Number(entry.analysis[key] || 0), 0)]))
  return { entries: refreshed, items: analyzed.map((entry) => ({ entryId: String(entry._id), ...entry.analysis })), totals, date, provider, savedToEntry: true }
})

export const analytics = run(async (req) => {
  const timeZone = normalizeTimeZone(req.query.timeZone)
  const range = dateRangeForDays(req.query.days, timeZone)
  const beforeEnd = new Date(range.endExclusive.getTime() - 1)
  const [sleep, food, habits, logs] = await Promise.all([
    repo.listSleep(req.id, range.start.toISOString(), beforeEnd.toISOString()),
    repo.listFood(req.id, range.start.toISOString(), beforeEnd.toISOString()),
    repo.listHabits(req.id),
    repo.listHabitLogs(req.id, range.startDate, range.endDate),
  ])
  const data = buildDailyAnalytics({ dates: range.dates, timeZone: range.timeZone, sleep, food, habits, logs })
  return { days: range.dates.length, timeZone, ...data }
})
