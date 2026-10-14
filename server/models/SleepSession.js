import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true }, bedtime: Date, wakeTime: Date, active: { type: Boolean, default: false }, note: String }, { timestamps: true })
schema.index({ userId: 1, bedtime: -1 })
schema.index({ userId: 1, active: 1 }, { unique: true, partialFilterExpression: { active: true } })
export default mongoose.model('SleepSession', schema)
