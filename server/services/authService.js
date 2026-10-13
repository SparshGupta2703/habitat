import { createUser, findUserByEmail } from "../repositories/userRepository.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'


export const signupUser = async ({ name, email, password }) => {
    if (!name?.trim() || !email?.trim() || !password || password.length < 8) throw new Error('Name, email, and a password of at least 8 characters are required')
    email = email.trim().toLowerCase()

    const existingUser = await findUserByEmail(email);

    if (existingUser) {
        throw new Error("User Already Exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await createUser({
        name,
        email,
        password: hashedPassword
    });

    const token = jwt.sign(
        { userId: newUser._id },
        process.env.JWT_SECRET,
        { expiresIn: "24h" }
    );

    return {
        token,
        user: {
            userId: newUser._id,
            userEmail: newUser.email,
            userName: newUser.name,
            userImg: newUser.profileImg,
            userDesc: newUser.UserDesc
        }
    };
};
export const loginUser=async({email,password})=>{

    if (!email?.trim() || !password) throw new Error('Email and password are required')

    const user=await findUserByEmail(email.trim().toLowerCase())
    if(!user){ 
        throw new Error("Invalid email or password")
        }
        const isMatch=await bcrypt.compare(password, user.password)
        if(!isMatch){
        throw new Error("Invalid email or password")
        }
        const token = await jwt.sign({userId:user._id},process.env.JWT_SECRET,{expiresIn:'24h'})
        return{token ,user:{
            userId:user._id,
            userEmail:user.email,
            userName:user.name,
            userImg:user.profileImg,
            userDesc:user.UserDesc
        }}

    
   
}
