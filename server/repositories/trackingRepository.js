import SleepSession from '../models/SleepSession.js'
import FoodEntry from '../models/FoodEntry.js'
import Habit from '../models/Habit.js'
import HabitLog from '../models/HabitLog.js'

export const listSleep = (userId, from, to) => SleepSession.find({ userId, ...(from || to ? { bedtime: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) } } : {}) }).sort({ bedtime: -1 })
export const findOpenSleep = (userId) => SleepSession.findOne({ userId, $or: [{ active: true }, { wakeTime: { $exists: false } }] }).sort({ bedtime: -1 })
export const createSleep = (data) => SleepSession.create({ ...data, active: true })
export const updateSleep = (userId, id, data) => SleepSession.findOneAndUpdate({ _id: id, userId }, { ...data, ...(data.wakeTime ? { active: false } : {}) }, { new: true, runValidators: true })
export const deleteSleep = (userId, id) => SleepSession.findOneAndDelete({ _id: id, userId })
export const listFood = (userId, from, to) => FoodEntry.find({ userId, ...(from || to ? { eatenAt: { ...(from ? { $gte: new Date(from) } : {}), ...(to ? { $lte: new Date(to) } : {}) } } : {}) }).sort({ eatenAt: -1 })
export const createFood = (data) => FoodEntry.create(data)
export const updateFood = (userId, id, data) => {
  const { analysis, ...fields } = data
  const update = { $set: fields }
  if (analysis) update.$set.analysis = analysis
  else update.$unset = { analysis: 1 }
  return FoodEntry.findOneAndUpdate({ _id: id, userId }, update, { new: true, runValidators: true })
}
export const deleteFood = (userId, id) => FoodEntry.findOneAndDelete({ _id: id, userId })
export const findFood = (userId, ids) => FoodEntry.find({ userId, _id: { $in: ids } })
export const saveFoodAnalysis = (userId, id, analysis) => FoodEntry.findOneAndUpdate({ _id: id, userId }, { analysis }, { new: true })
export const listHabits = (userId, includeArchived = false) => Habit.find({ userId, ...(includeArchived ? {} : { archived: false }) }).sort({ createdAt: 1 })
export const createHabit = (data) => Habit.create(data)
export const updateHabit = (userId, id, data) => Habit.findOneAndUpdate({ _id: id, userId }, data, { new: true, runValidators: true })
export const deleteHabit = (userId, id) => Habit.findOneAndDelete({ _id: id, userId })
export const listHabitLogs = (userId, from, to) => HabitLog.find({ userId, ...(from || to ? { date: { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) } } : {}) }).sort({ date: -1 })
export const setHabitLog = (userId, habitId, date, completed, fields = {}) => completed ? HabitLog.findOneAndUpdate({ userId, habitId, date }, { userId, habitId, date, completedAt: new Date(), ...fields }, { upsert: true, new: true, runValidators: true }) : HabitLog.findOneAndDelete({ userId, habitId, date })
export const getHabitForUser = (userId, habitId) => Habit.findOne({ _id: habitId, userId })
