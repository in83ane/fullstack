import mongoose, { Schema, Document, Model } from 'mongoose'

export interface ISystemSetting extends Document {
  key: string
  value: string | null
}

const SystemSettingSchema = new Schema<ISystemSetting>({
  key: { type: String, required: true, unique: true },
  value: { type: String, default: null },
})

const SystemSetting: Model<ISystemSetting> =
  mongoose.models.SystemSetting ??
  mongoose.model<ISystemSetting>('SystemSetting', SystemSettingSchema)
export default SystemSetting
