import { completeAdminSetup, loginUser, signupUser } from "../services/authService.js"
import protect from '../middlewares/authMiddleware.js'

export const signup =async(req,res)=>{
 try{
  const data = await signupUser(req.body);

res.status(201).json({
    success: true,
    message: "Account created successfully",
    token: data.token,
    user: data.user
});

 }
 catch(err){
    console.error("Signup failed:",err.message)
    res.status(400).json({
        success:false,
        message:err.message
    })
 }
}
export const login=async(req,res)=>{
   try {
      const data = await loginUser(req.body);

      res.status(200).json({
         success: true,
         message: "Login successful",
         token: data.token,
         user: data.user
});
      
   } catch (err) {
      res.status(400).json({
         success:false,
         message:err.message
      })
      
   }
}

export const finishAdminSetup = [protect, async (req, res, next) => {
   try {
      const user = await completeAdminSetup(req.id, req.body.password)
      res.json({ success: true, message: 'Administrator password updated.', data: { user } })
   } catch (error) { next(error) }
}]

export const currentUser = [protect, (req, res) => res.json({ success: true, data: { user: {
   userId: req.id,
   userEmail: req.user.email,
   userName: req.user.name,
   role: req.user.role || 'user',
   mustChangePassword: Boolean(req.user.mustChangePassword),
} } })]
