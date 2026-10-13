import mongoose from 'mongoose'
const schema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true }, text: { type: String, required: true, trim: true }, eatenAt: { type: Date, default: Date.now }, analysis: { name: String, quantity: String, calories: Number, protein: Number, carbohydrates: Number, fats: Number, items: [mongoose.Schema.Types.Mixed] } }, { timestamps: true })
export default mongoose.model('FoodEntry', schema)
