import ApplicationSetting from '../../models/ApplicationSetting.js'
import { analyzeWithGemini } from './geminiProvider.js'
import { analyzeWithGroq } from './groqProvider.js'

const configured = (provider) => provider === 'gemini' ? Boolean(process.env.GEMINI_API_KEY) : Boolean(process.env.GROQ_API_KEY)
const defaultProvider = () => process.env.AI_PROVIDER === 'groq' ? 'groq' : 'gemini'

export async function getActiveProvider() {
  const setting = await ApplicationSetting.findOne({ key: 'aiProvider' }).lean()
  return setting?.value === 'groq' ? 'groq' : setting?.value === 'gemini' ? 'gemini' : defaultProvider()
}

export async function getProviderStatus() {
  const active = await getActiveProvider()
  return { active, providers: { gemini: { configured: configured('gemini'), model: process.env.GEMINI_MODEL || 'gemini-3.8-flash' }, groq: { configured: configured('groq'), model: process.env.GROQ_MODEL || 'openai/gpt-oss-20b' } } }
}

export async function setActiveProvider(provider) {
  if (!['gemini', 'groq'].includes(provider)) throw Object.assign(new Error('Choose Gemini or Groq.'), { status: 400 })
  if (!configured(provider)) throw Object.assign(new Error(`${provider === 'gemini' ? 'Gemini' : 'Groq'} API key is not configured on the server. The active provider was not changed.`), { status: 503 })
  await ApplicationSetting.findOneAndUpdate({ key: 'aiProvider' }, { $set: { value: provider } }, { upsert: true, returnDocument: 'after', runValidators: true })
  return getProviderStatus()
}

export async function analyzeNutrition(entries) {
  const provider = await getActiveProvider()
  if (!configured(provider)) throw Object.assign(new Error(`${provider === 'gemini' ? 'Gemini' : 'Groq'} API key is not configured on the server.`), { status: 503, kind: 'credentials' })
  try {
    const result = provider === 'groq' ? await analyzeWithGroq(entries) : await analyzeWithGemini(entries)
    return { provider, result }
  } catch (error) {
    if (error.kind) throw error
    console.error(`${provider} nutrition response could not be parsed as JSON`)
    throw Object.assign(new Error('The nutrition provider returned invalid data. The food entries were kept; retry analysis.'), { status: 502, kind: 'invalid-response' })
  }
}
