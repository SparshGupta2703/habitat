import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, name: { type: String, required: true, trim: true }, description: String, trackTimestamp: { type: Boolean, default: false }, trackQuantity: { type: Boolean, default: false }, quantityType: { type: String, enum: ['number', 'duration'], default: 'number' }, quantityUnit: { type: String, default: '' }, archived: { type: Boolean, default: false } }, { timestamps: true })
export default mongoose.model('Habit', schema)
