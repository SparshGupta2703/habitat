import User from "../models/User.js"

export const findUserByEmail = async(email)=>{
    return await User.findOne({email: email.trim().toLowerCase()})
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
    return await User.findByIdAndUpdate(userId,updates,{returnDocument:'after'}).select('-password')
}

export async function listUsers({ search = '', page = 1, limit = 20 }) {
    const filter = search ? { $or: [
        { name: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
        { email: { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' } },
    ] } : {}
    const [users, total] = await Promise.all([
        User.find(filter).select('name email role createdAt').sort({ createdAt: -1, _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
        User.countDocuments(filter),
    ])
    return { users, page, limit, total, pages: Math.ceil(total / limit) }
}

export async function getUserMetadata(id) {
    return User.findById(id).select('name email role createdAt').lean()
}
