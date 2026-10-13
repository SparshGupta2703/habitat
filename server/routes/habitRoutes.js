import { Router } from 'express'
import protect from '../middlewares/authMiddleware.js'
import { createHabit, deleteHabit, editHabit, habitHistory, listHabits, setHabitLog } from '../controllers/trackingController.js'
const router = Router(); router.use(protect)
router.get('/', listHabits); router.post('/', createHabit); router.get('/history', habitHistory); router.put('/:id/log', setHabitLog); router.patch('/:id', editHabit); router.delete('/:id', deleteHabit)
export default router
