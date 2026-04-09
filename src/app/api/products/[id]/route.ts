import { NextRequest, NextResponse } from 'next/server'
import { requireOwner, handleAuthError } from '@/server/auth/requireAuth'
import * as productService from '@/server/services/product.service'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner(request)
    const { id } = await params
    const data = await request.json()

    if (data.toggleVisibility) {
      const product = await productService.toggleProductVisibility(id)
      return NextResponse.json({ product })
    }

    if (data.updateCategory) {
      await productService.updateCategoryName(data.oldName, data.newName)
      return NextResponse.json({ success: true })
    }

    const product = await productService.updateProduct(id, data)
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
    return NextResponse.json({ product })
  } catch (error) {
    return handleAuthError(error)
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireOwner(request)
    const { id } = await params
    const { deleteCategory } = await request.json().catch(() => ({}))

    if (deleteCategory) {
      await productService.deleteByCategory(id) // id here is category name
      return NextResponse.json({ success: true })
    }

    await productService.deleteProduct(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleAuthError(error)
  }
}
