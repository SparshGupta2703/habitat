import { Router } from 'express'
import protect from '../middlewares/authMiddleware.js'
import { analyzeFood, createFood, deleteFood, editFood, listFood } from '../controllers/trackingController.js'
const router = Router(); router.use(protect)
router.get('/', listFood); router.post('/', createFood); router.post('/analyze', analyzeFood); router.patch('/:id', editFood); router.delete('/:id', deleteFood)
export default router
