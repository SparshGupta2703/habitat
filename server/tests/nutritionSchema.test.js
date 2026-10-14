import test from 'node:test'
import assert from 'node:assert/strict'
import { nutritionSchema, validateNutritionEntries } from '../services/ai/nutritionSchema.js'

const item = (entryId, values = {}) => ({ entryId, name: 'Rice', quantity: '1 bowl', calories: 200, protein: 4, carbohydrates: 45, fats: 1, ...values })

test('nutrition result validates one normalized result for each food entry', () => {
  assert.equal(validateNutritionEntries({ entries: [item('a'), item('b')] }, ['a', 'b']), null)
  assert.equal(nutritionSchema.properties.entries.items.required.includes('fats'), true)
})

test('nutrition validation rejects missing, duplicate, unexpected and invalid values', () => {
  assert.equal(validateNutritionEntries({ entries: [item('a')] }, ['a', 'b']), 'incomplete')
  assert.equal(validateNutritionEntries({ entries: [item('a'), item('a')] }, ['a', 'b']), 'ids')
  assert.equal(validateNutritionEntries({ entries: [item('other')] }, ['a']), 'ids')
  assert.equal(validateNutritionEntries({ entries: [item('a', { calories: Infinity })] }, ['a']), 'values')
  assert.equal(validateNutritionEntries({ entries: [item('a', { fats: -1 })] }, ['a']), 'values')
  assert.equal(validateNutritionEntries({ entries: [item('a', { calories: 100001 })] }, ['a']), 'values')
  assert.equal(validateNutritionEntries({ entries: [item('a', { name: ' ' })] }, ['a']), 'fields')
})
