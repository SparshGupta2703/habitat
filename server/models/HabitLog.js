import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, habitId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, date: { type: String, required: true }, completedAt: Date, timestamp: Date, quantityValue: Number, note: String }, { timestamps: true })
schema.index({ userId: 1, habitId: 1, date: 1 }, { unique: true })
export default mongoose.model('HabitLog', schema)
