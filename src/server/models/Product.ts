import mongoose, { Schema, Document, Model } from 'mongoose'

export interface IProduct extends Document {
  _id: mongoose.Types.ObjectId
  name: string
  category: string | null
  detail: string | null
  price1: number
  price2: number
  price3: number
  visible: boolean
  isVisible: boolean
  createdAt: Date
  updatedAt: Date
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, default: null },
    detail: { type: String, default: null },
    price1: { type: Number, default: 0 },
    price2: { type: Number, default: 0 },
    price3: { type: Number, default: 0 },
    visible: { type: Boolean, default: true },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
)

const Product: Model<IProduct> =
  mongoose.models.Product ?? mongoose.model<IProduct>('Product', ProductSchema)
export default Product
