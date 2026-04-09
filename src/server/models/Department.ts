import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  colorCode: string
  createdAt: Date
}

const DepartmentSchema = new Schema<IDepartment>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    colorCode: { type: String, default: '#334155' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const Department: Model<IDepartment> =
  mongoose.models.Department ?? mongoose.model<IDepartment>('Department', DepartmentSchema)
export default Department
