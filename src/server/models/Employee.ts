import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IEmployee extends Document {
  _id: mongoose.Types.ObjectId
  staffId: string | null
  name: string
  imageUrl: string | null
  departmentId: mongoose.Types.ObjectId | null
  isActive: boolean
  userId: mongoose.Types.ObjectId | null
  createdAt: Date
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    staffId: { type: String, default: null },
    name: { type: String, required: true, trim: true },
    imageUrl: { type: String, default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    isActive: { type: Boolean, default: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const Employee: Model<IEmployee> =
  mongoose.models.Employee ?? mongoose.model<IEmployee>('Employee', EmployeeSchema)
export default Employee
