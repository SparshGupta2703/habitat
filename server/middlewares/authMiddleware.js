import jwt from 'jsonwebtoken'
import User from '../models/User.js'
const protect=async(req,res,next)=>{
  const authHeader =req.headers.authorization

  if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).json({
        success:false,
        message:'token not found'
    })
  }
  const token= authHeader.split(' ')[1]
    let decoded
    try { decoded = jwt.verify(token, process.env.JWT_SECRET) }
    catch { return res.status(401).json({ success: false, message: 'Invalid token or token expired' }) }
    try {
        const user = await User.findById(decoded.userId).select('role mustChangePassword name email').lean()
        if (!user) return res.status(401).json({ success: false, message: 'Account not found.' })
        req.id=String(user._id)
        req.user=user
        next()
    }
    catch(err){ next(err) }
  
}
export default protect
