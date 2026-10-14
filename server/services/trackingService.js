import * as repository from '../repositories/trackingRepository.js'
import { dateRangeForDate, isDateKey, localDateKey, normalizeTimeZone } from './dateService.js'

export const getSleep = (userId, query) => repository.listSleep(userId, query.from, query.to)
export const addSleep = async (userId, body) => {
  const openSession = await repository.findOpenSleep(userId)
  if (openSession) throw Object.assign(new Error('Finish your current sleep session by logging a wake-up time first.'), { status: 409 })
  const bedtime = new Date(body.bedtime)
  if (!body.bedtime || Number.isNaN(bedtime.getTime())) throw Object.assign(new Error('Choose a valid bedtime.'), { status: 400 })
  return repository.createSleep({ userId, bedtime, note: body.note })
}
export const editSleep = (userId, id, body) => repository.updateSleep(userId, id, { bedtime: body.bedtime, wakeTime: body.wakeTime, note: body.note })
export const getFood = (userId, query) => {
  if (query.date) {
    const range = dateRangeForDate(query.date, query.timeZone)
    return repository.listFoodForDate(userId, query.date, range.start, range.endExclusive)
  }
  return repository.listFood(userId, query.from, query.to)
}
export const addFood = (userId, body) => {
  if (!body.text?.trim()) throw Object.assign(new Error('Food description is required'), { status: 400 })
  const eatenAt = body.eatenAt ? new Date(body.eatenAt) : new Date()
  if (!Number.isFinite(eatenAt.getTime())) throw Object.assign(new Error('Choose a valid food entry time.'), { status: 400 })
  const timeZone = normalizeTimeZone(body.timeZone)
  return repository.createFood({ userId, text: body.text.trim(), eatenAt, localDate: localDateKey(eatenAt, timeZone) })
}
export const editFood = (userId, id, body) => {
  const fields = {}
  if (body.text !== undefined) {
    if (!body.text.trim()) throw Object.assign(new Error('Food description is required'), { status: 400 })
    fields.text = body.text.trim()
  }
  if (body.eatenAt !== undefined) {
    const eatenAt = new Date(body.eatenAt)
    if (!Number.isFinite(eatenAt.getTime())) throw Object.assign(new Error('Choose a valid food entry time.'), { status: 400 })
    fields.eatenAt = eatenAt
    fields.localDate = localDateKey(eatenAt, normalizeTimeZone(body.timeZone))
  }
  if (body.text !== undefined || body.eatenAt !== undefined) fields.analysisStatus = 'pending'
  if (body.analysis !== undefined) {
    const keys = ['calories', 'protein', 'carbohydrates', 'fats']
    if (!body.analysis || keys.some((key) => !Number.isFinite(body.analysis[key]) || body.analysis[key] < 0)) throw Object.assign(new Error('Nutrition values must be non-negative numbers.'), { status: 400 })
    fields.analysis = body.analysis
    fields.analysisStatus = 'analyzed'
  }
  return repository.updateFood(userId, id, fields)
}
export const getHabits = (userId, includeArchived) => repository.listHabits(userId, includeArchived)
export const addHabit = (userId, body) => {
  if (!body.name?.trim()) throw Object.assign(new Error('Habit name is required'), { status: 400 })
  return repository.createHabit({ userId, name: body.name.trim(), description: body.description, trackTimestamp: Boolean(body.trackTimestamp), trackQuantity: Boolean(body.trackQuantity), quantityType: body.quantityType === 'duration' ? 'duration' : 'number', quantityUnit: body.quantityUnit?.trim().slice(0, 16) || '' })
}
export const editHabit = (userId, id, body) => repository.updateHabit(userId, id, { ...(body.name !== undefined ? { name: body.name.trim() } : {}), ...(body.description !== undefined ? { description: body.description } : {}), ...(body.trackTimestamp !== undefined ? { trackTimestamp: Boolean(body.trackTimestamp) } : {}), ...(body.trackQuantity !== undefined ? { trackQuantity: Boolean(body.trackQuantity) } : {}), ...(body.quantityType !== undefined ? { quantityType: body.quantityType === 'duration' ? 'duration' : 'number' } : {}), ...(body.quantityUnit !== undefined ? { quantityUnit: body.quantityUnit.trim().slice(0, 16) } : {}), ...(body.archived !== undefined ? { archived: body.archived } : {}) })
export const logHabit = async (userId, habitId, body) => {
  const habit = await repository.getHabitForUser(userId, habitId)
  if (!habit) throw Object.assign(new Error('Habit not found'), { status: 404 })
  const date = body.date || localDateKey(new Date(), body.timeZone)
  if (!isDateKey(date)) throw Object.assign(new Error('Choose a valid habit date.'), { status: 400 })
  if (!body.completed) return repository.setHabitLog(userId, habitId, date, false)
  const fields = {}
  if (habit.trackTimestamp) {
    const timestamp = new Date(body.timestamp)
    if (!body.timestamp || Number.isNaN(timestamp.getTime())) throw Object.assign(new Error('Choose a valid time for this habit.'), { status: 400 })
    fields.timestamp = timestamp
  }
  if (habit.trackQuantity) {
    const quantityValue = Number(body.quantityValue)
    if (body.quantityValue === '' || !Number.isFinite(quantityValue) || quantityValue < 0 || quantityValue > 1000000) throw Object.assign(new Error('Enter a valid non-negative quantity.'), { status: 400 })
    fields.quantityValue = quantityValue
  }
  return repository.setHabitLog(userId, habitId, date, Boolean(body.completed), fields)
}
export const getHabitHistory = (userId, query) => repository.listHabitLogs(userId, query.from, query.to)
export const remove = async (operation) => {
  const result = await operation
  if (!result) throw Object.assign(new Error('Entry not found'), { status: 404 })
  return result
}
