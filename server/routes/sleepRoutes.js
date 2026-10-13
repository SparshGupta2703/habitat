import { Router } from 'express'
import protect from '../middlewares/authMiddleware.js'
import { createSleep, deleteSleep, editSleep, listSleep } from '../controllers/trackingController.js'
const router = Router(); router.use(protect)
router.get('/', listSleep); router.post('/', createSleep); router.patch('/:id', editSleep); router.delete('/:id', deleteSleep)
export default router
