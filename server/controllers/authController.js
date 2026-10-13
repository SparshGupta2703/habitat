import { loginUser, signupUser } from "../services/authService.js"

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
