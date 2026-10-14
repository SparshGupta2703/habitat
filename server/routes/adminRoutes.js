import { Router } from 'express'
import protect from '../middlewares/authMiddleware.js'
import { requireAdmin } from '../middlewares/adminMiddleware.js'
import { providerStatus, updateProvider, userDetails, users } from '../controllers/adminController.js'

const router = Router()
router.use(protect, requireAdmin)
router.get('/users', users)
router.get('/users/:id', userDetails)
router.get('/settings/ai-provider', providerStatus)
router.patch('/settings/ai-provider', updateProvider)
export default router
