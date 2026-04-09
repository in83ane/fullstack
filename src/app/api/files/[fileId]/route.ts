import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, handleAuthError } from '@/server/auth/requireAuth'
import { getFileFromGridFS } from '@/server/gridfs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ fileId: string }> }
) {
  try {
    await requireAuth(request)
  } catch (error) {
    return handleAuthError(error)
  }

  try {
    const { fileId } = await params
    const { stream, contentType } = await getFileFromGridFS(fileId)

    // Convert Node.js readable stream to Web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk: Buffer) => controller.enqueue(chunk))
        stream.on('end', () => controller.close())
        stream.on('error', (err) => controller.error(err))
      },
    })

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
