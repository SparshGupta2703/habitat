import { nutritionPrompt, nutritionSchema } from './nutritionSchema.js'
import { requestProvider } from './providerRequest.js'

export async function analyzeWithGemini(entries) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw Object.assign(new Error('Gemini is not configured on the server.'), { status: 503, kind: 'credentials' })
  const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash'
  const response = await requestProvider(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: nutritionPrompt(entries) }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: nutritionSchema } }),
  }, 'Gemini')
  const body = await response.json()
  return JSON.parse(body.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('') || '')
}
