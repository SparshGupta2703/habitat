import express from 'express'
import { currentUser, finishAdminSetup, login, signup } from '../controllers/authController.js'

const router =express.Router()

router.post('/signup',signup)
router.post('/login',login)
router.get('/me', ...currentUser)
router.post('/complete-admin-setup', ...finishAdminSetup)

export default router;
