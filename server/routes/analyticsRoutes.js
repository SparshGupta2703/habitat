import { Router } from 'express'
import protect from '../middlewares/authMiddleware.js'
import { analytics } from '../controllers/trackingController.js'
const router = Router(); router.use(protect); router.get('/', analytics)
export default router
