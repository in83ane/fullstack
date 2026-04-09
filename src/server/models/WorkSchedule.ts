import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IWorkSchedule extends Document {
  _id: mongoose.Types.ObjectId
  workTime: string | null
  workShift: string | null
  detail: string | null
  workDate: Date | null
  endDate: Date | null
  userId: mongoose.Types.ObjectId | null
  status: 'pending' | 'inprogress' | 'complete'
  employeeId: mongoose.Types.ObjectId | null
  departmentId: mongoose.Types.ObjectId | null
  department: string | null
  workerRole: string | null
  worker: string | null
  startedAt: Date | null
  completedAt: Date | null
  employeeIds: mongoose.Types.ObjectId[]
  lat: number | null
  lng: number | null
  startPhotoUrl: string | null
  completePhotoUrl: string | null
  summary: string | null
  createdAt: Date
}

const WorkScheduleSchema = new Schema<IWorkSchedule>(
  {
    workTime: { type: String, default: null },
    workShift: { type: String, default: null },
    detail: { type: String, default: null },
    workDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['pending', 'inprogress', 'complete'], default: 'pending' },
    employeeId: { type: Schema.Types.ObjectId, ref: 'Employee', default: null },
    departmentId: { type: Schema.Types.ObjectId, ref: 'Department', default: null },
    department: { type: String, default: null },
    workerRole: { type: String, default: null },
    worker: { type: String, default: null },
    startedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
    employeeIds: [{ type: Schema.Types.ObjectId, ref: 'Employee' }],
    lat: { type: Number, default: null },
    lng: { type: Number, default: null },
    startPhotoUrl: { type: String, default: null },
    completePhotoUrl: { type: String, default: null },
    summary: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
)

const WorkSchedule: Model<IWorkSchedule> =
  mongoose.models.WorkSchedule ??
  mongoose.model<IWorkSchedule>('WorkSchedule', WorkScheduleSchema)
export default WorkSchedule
