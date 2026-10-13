import jwt from 'jsonwebtoken'
const protect=(req,res,next)=>{
  const authHeader =req.headers.authorization

  if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).json({
        success:false,
        message:'token not found'
    })
  }
  const token= authHeader.split(' ')[1]
    try{
        const decoded=jwt.verify(token,process.env.JWT_SECRET)
        req.id=decoded.userId
        next()
    }
    catch(err){
        res.status(401).json({
            success:false,
            message:"Invalid token or token expired"
        })
    }
  
}
export default protect
