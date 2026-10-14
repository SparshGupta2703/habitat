import { createUser, findUserByEmail } from "../repositories/userRepository.js"
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'


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
        password: hashedPassword,
        role: 'user',
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
            role: newUser.role,
            mustChangePassword: newUser.mustChangePassword,
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
        role:user.role || 'user',
        mustChangePassword:Boolean(user.mustChangePassword),
            userImg:user.profileImg,
            userDesc:user.UserDesc
        }}

    
   
}

export async function completeAdminSetup(userId, password) {
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw Object.assign(new Error('Choose a password between 8 and 128 characters.'), { status: 400 })
    const user = await User.findById(userId)
    if (!user || user.role !== 'admin' || !user.mustChangePassword) throw Object.assign(new Error('No initial administrator password change is pending.'), { status: 403 })
    user.password = await bcrypt.hash(password, 10)
    user.mustChangePassword = false
    await user.save()
    return { userId: user._id, userEmail: user.email, userName: user.name, role: user.role, mustChangePassword: false }
}
