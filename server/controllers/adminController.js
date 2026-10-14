import mongoose from 'mongoose'
import { getUserMetadata, listUsers } from '../repositories/userRepository.js'
import { getProviderStatus, setActiveProvider } from '../services/ai/aiProviderService.js'

const wrap = (handler) => async (req, res, next) => {
  try { res.json({ success: true, data: await handler(req) }) } catch (error) { next(error) }
}

export const users = wrap(async (req) => {
  const page = Math.max(1, Math.min(100000, Number.parseInt(req.query.page, 10) || 1))
  const limit = Math.max(1, Math.min(50, Number.parseInt(req.query.limit, 10) || 20))
  const search = typeof req.query.search === 'string' ? req.query.search.trim().slice(0, 80) : ''
  return listUsers({ page, limit, search })
})

export const userDetails = wrap(async (req) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw Object.assign(new Error('User not found.'), { status: 404 })
  const user = await getUserMetadata(req.params.id)
  if (!user) throw Object.assign(new Error('User not found.'), { status: 404 })
  return user
})

export const providerStatus = wrap(() => getProviderStatus())
export const updateProvider = wrap(async (req) => setActiveProvider(req.body.provider))
