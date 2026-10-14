import mongoose from 'mongoose'
const schema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  text: { type: String, required: true, trim: true },
  eatenAt: { type: Date, default: Date.now },
  localDate: { type: String, match: /^\d{4}-\d{2}-\d{2}$/ },
  analysisStatus: { type: String, enum: ['pending', 'analyzed', 'failed'], default: 'pending' },
  analysisError: { type: String, maxlength: 240 },
  analysis: { name: String, quantity: String, calories: Number, protein: Number, carbohydrates: Number, fats: Number, items: [mongoose.Schema.Types.Mixed] },
}, { timestamps: true })
schema.index({ userId: 1, localDate: 1, eatenAt: -1 })
schema.index({ userId: 1, eatenAt: -1 })
export default mongoose.model('FoodEntry', schema)
