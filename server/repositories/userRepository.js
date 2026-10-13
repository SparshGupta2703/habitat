import User from "../models/User.js"

export const findUserByEmail = async(email)=>{
    return await User.findOne({email})
}
export const createUser = async(userData) => {
    return await User.create(userData)
}
export const findUserById= async(id)=>{
    return await User.findById(id).select('-password')
}
export const findUserByIdWithPassword=async(userId)=>{
        return await User.findById(userId)
}
export const findUserByIdAndUpdate=async(userId,updates)=>{
    return await User.findByIdAndUpdate(userId,updates,{new:true}).select('-password')
}