import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin, handleAuthError, requireOwner } from '@/server/auth/requireAuth'
import * as productService from '@/server/services/product.service'

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request)
    const products = await productService.listProducts()
    return NextResponse.json({ products })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireOwner(request)
    const data = await request.json()
    if (!data.name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    const product = await productService.createProduct(data)
    return NextResponse.json({ product }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
