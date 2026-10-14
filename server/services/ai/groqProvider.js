import { nutritionPrompt, nutritionSchema } from './nutritionSchema.js'
import { requestProvider } from './providerRequest.js'

export async function analyzeWithGroq(entries) {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw Object.assign(new Error('Groq is not configured on the server.'), { status: 503, kind: 'credentials' })
  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b'
  const response = await requestProvider('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0, messages: [{ role: 'user', content: nutritionPrompt(entries) }], response_format: { type: 'json_schema', json_schema: { name: 'nutrition_entries', strict: true, schema: nutritionSchema } } }),
  }, 'Groq')
  const body = await response.json()
  return JSON.parse(body.choices?.[0]?.message?.content || '')
}
