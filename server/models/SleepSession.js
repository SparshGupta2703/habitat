import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, bedtime: Date, wakeTime: Date, active: { type: Boolean, default: false }, note: String }, { timestamps: true })
schema.index({ userId: 1 }, { unique: true, partialFilterExpression: { active: true } })
export default mongoose.model('SleepSession', schema)
