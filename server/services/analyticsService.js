import { localDateKey } from './dateService.js'

export function buildDailyAnalytics({ dates, timeZone, sleep, food, habits, logs }) {
  const rows = new Map(dates.map((date) => [date, {
    date, sleepHours: null, calories: null, protein: null, carbohydrates: null, fats: null,
    foodEntries: 0, analyzedFoodEntries: 0, pendingFoodEntries: 0, failedFoodEntries: 0,
    habitsCompleted: 0, habitsTotal: habits.length, habitValues: {},
  }]))
  for (const session of sleep) {
    if (!session.bedtime || !session.wakeTime) continue
    const row = rows.get(localDateKey(session.bedtime, timeZone))
    if (!row) continue
    const duration = (new Date(session.wakeTime) - new Date(session.bedtime)) / 3600000
    if (!Number.isFinite(duration) || duration <= 0 || duration > 24) continue
    row.sleepHours = (row.sleepHours ?? 0) + duration
  }
  for (const entry of food) {
    const row = rows.get(entry.localDate || localDateKey(entry.eatenAt, timeZone))
    if (!row) continue
    row.foodEntries++
    if (entry.analysis && (entry.analysisStatus === 'analyzed' || !entry.analysisStatus)) {
      row.analyzedFoodEntries++
      for (const key of ['calories', 'protein', 'carbohydrates', 'fats']) row[key] = (row[key] ?? 0) + Number(entry.analysis[key] || 0)
    } else if (entry.analysisStatus === 'failed') row.failedFoodEntries++
    else row.pendingFoodEntries++
  }
  for (const row of rows.values()) {
    if (row.foodEntries && row.analyzedFoodEntries !== row.foodEntries) {
      row.calories = row.protein = row.carbohydrates = row.fats = null
    }
  }
  const logsByDayHabit = new Map()
  for (const log of logs) {
    const row = rows.get(log.date)
    if (!row) continue
    const habitId = String(log.habitId)
    row.habitsCompleted++
    const habit = habits.find((item) => String(item._id) === habitId)
    if (habit) row.habitValues[habitId] = Number(log.quantityValue ?? (habit.trackQuantity ? 0 : 1))
    logsByDayHabit.set(`${habitId}:${log.date}`, log)
  }
  const series = [...rows.values()].map((row) => ({
    ...row,
    sleepHours: row.sleepHours === null ? null : Math.round(row.sleepHours * 10) / 10,
    habitRate: row.habitsTotal ? Math.round(row.habitsCompleted / row.habitsTotal * 100) : null,
    nutritionComplete: row.foodEntries > 0 && row.analyzedFoodEntries === row.foodEntries,
  }))
  const habitSeries = habits.map((habit) => {
    const id = String(habit._id)
    return {
      id, name: habit.name, trackTimestamp: habit.trackTimestamp, trackQuantity: habit.trackQuantity,
      quantityType: habit.quantityType, quantityUnit: habit.quantityUnit,
      history: dates.map((date) => {
        const log = logsByDayHabit.get(`${id}:${date}`)
        return { date, status: log ? 'completed' : 'unknown', completed: Boolean(log), quantity: log ? Number(log.quantityValue ?? (habit.trackQuantity ? 0 : 1)) : null, timestamp: log?.timestamp || null }
      }),
    }
  })
  return { series, habits: habitSeries }
}
