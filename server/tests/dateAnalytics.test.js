import test from 'node:test'
import assert from 'node:assert/strict'
import { dateRangeForDate, dateRangeForDays, localDateKey } from '../services/dateService.js'
import { buildDailyAnalytics } from '../services/analyticsService.js'

test('local calendar dates are derived in the requested timezone', () => {
  assert.equal(localDateKey('2026-10-14T19:00:00.000Z', 'Asia/Kolkata'), '2026-10-15')
  assert.equal(localDateKey('2026-10-14T19:00:00.000Z', 'UTC'), '2026-10-14')
})

test('zoned date ranges account for daylight saving transitions', () => {
  const spring = dateRangeForDate('2026-03-08', 'America/New_York')
  const fall = dateRangeForDate('2026-11-01', 'America/New_York')
  assert.equal((spring.endExclusive - spring.start) / 3600000, 23)
  assert.equal((fall.endExclusive - fall.start) / 3600000, 25)
})

test('range data is chronological and has exactly the requested date keys', () => {
  const range = dateRangeForDays(7, 'Asia/Kolkata', new Date('2026-10-14T18:30:00Z'))
  assert.equal(range.dates.length, 7)
  assert.equal(range.dates[0], '2026-10-09')
  assert.equal(range.dates.at(-1), '2026-10-15')
  assert.deepEqual(range.dates, [...range.dates].sort())
})

test('daily nutrition is isolated by local date and incomplete analysis stays unknown', () => {
  const data = buildDailyAnalytics({
    dates: ['2026-10-14', '2026-10-15'], timeZone: 'Asia/Kolkata', sleep: [], habits: [], logs: [],
    food: [
      { localDate: '2026-10-14', analysisStatus: 'analyzed', analysis: { calories: 500, protein: 20, carbohydrates: 60, fats: 15 } },
      { localDate: '2026-10-15', analysisStatus: 'failed' },
    ],
  })
  assert.equal(data.series[0].calories, 500)
  assert.equal(data.series[1].calories, null)
  assert.equal(data.series[1].failedFoodEntries, 1)
})

test('completed sleep is assigned to bedtime date; open and invalid sessions are omitted', () => {
  const data = buildDailyAnalytics({
    dates: ['2026-10-14', '2026-10-15'], timeZone: 'Asia/Kolkata', food: [], habits: [], logs: [],
    sleep: [
      { bedtime: new Date('2026-10-14T16:30:00Z'), wakeTime: new Date('2026-10-14T23:00:00Z') },
      { bedtime: new Date('2026-10-14T14:00:00Z') },
      { bedtime: new Date('2026-10-14T14:00:00Z'), wakeTime: new Date('2026-10-15T16:00:00Z') },
    ],
  })
  assert.equal(data.series[0].sleepHours, 6.5)
  assert.equal(data.series[1].sleepHours, null)
})

test('missing records remain null and unknown habit dates are not marked missed', () => {
  const data = buildDailyAnalytics({ dates: ['2026-10-14'], timeZone: 'UTC', food: [], sleep: [], logs: [], habits: [{ _id: 'h1', name: 'Read', trackQuantity: false }] })
  assert.equal(data.series[0].sleepHours, null)
  assert.equal(data.series[0].calories, null)
  assert.deepEqual(data.habits[0].history[0], { date: '2026-10-14', status: 'unknown', completed: false, quantity: null, timestamp: null })
})

test('habit analytics retain actual numeric quantities and duration values', () => {
  const data = buildDailyAnalytics({ dates: ['2026-10-14'], timeZone: 'UTC', food: [], sleep: [], habits: [{ _id: 'water', name: 'Water', trackQuantity: true, quantityType: 'number', quantityUnit: 'glasses' }, { _id: 'study', name: 'Study', trackQuantity: true, quantityType: 'duration', quantityUnit: 'minutes' }], logs: [{ habitId: 'water', date: '2026-10-14', quantityValue: 6 }, { habitId: 'study', date: '2026-10-14', quantityValue: 45 }] })
  assert.equal(data.habits[0].history[0].quantity, 6)
  assert.equal(data.habits[1].history[0].quantity, 45)
})
