import { connectDB } from '../db'
import Product, { IProduct } from '../models/Product'

export async function listProducts(): Promise<IProduct[]> {
  await connectDB()
  return Product.find().sort({ updatedAt: -1 }).lean()
}

export async function createProduct(data: {
  name: string
  category?: string | null
  detail?: string | null
  price1?: number
  price2?: number
  price3?: number
}): Promise<IProduct> {
  await connectDB()
  return Product.create({ ...data, isVisible: true, visible: true })
}

export async function updateProduct(
  id: string,
  data: Partial<IProduct>
): Promise<IProduct | null> {
  await connectDB()
  return Product.findByIdAndUpdate(id, data, { new: true }).lean()
}

export async function deleteProduct(id: string): Promise<void> {
  await connectDB()
  await Product.findByIdAndDelete(id)
}

export async function updateCategoryName(
  oldName: string,
  newName: string
): Promise<void> {
  await connectDB()
  await Product.updateMany({ category: oldName }, { category: newName })
}

export async function deleteByCategory(category: string): Promise<void> {
  await connectDB()
  await Product.deleteMany({ category })
}

export async function toggleProductVisibility(id: string): Promise<IProduct | null> {
  await connectDB()
  const product = await Product.findById(id)
  if (!product) return null
  return Product.findByIdAndUpdate(id, { isVisible: !product.isVisible }, { new: true }).lean()
}
