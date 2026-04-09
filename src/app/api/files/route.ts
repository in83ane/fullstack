import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { requireAuth, handleAuthError } from '@/server/auth/requireAuth'
import { uploadFileToGridFS } from '@/server/gridfs'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB


const ALLOWED: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

// Magic byte
function detectMimeFromBuffer(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buf.subarray(4, 8).toString('ascii') === 'ftyp') return 'image/heic'
  return null
}

export async function POST(request: NextRequest) {
  try {
    await requireAuth(request)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size must not exceed 10MB' }, { status: 400 })
    }

    // blocks double extensions like .jpg.php
    const ext = file.name.split('.').pop()?.toLowerCase() ?? ''
    if (!(ext in ALLOWED)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // verify actual file content matches declared extension
    const detectedMime = detectMimeFromBuffer(buffer)
    if (!detectedMime || detectedMime !== ALLOWED[ext]) {
      return NextResponse.json({ error: 'File content does not match extension' }, { status: 400 })
    }

    // random filename prevents directory traversal and filename enumeration
    const safeFilename = `${randomUUID()}.${ext}`

    const fileId = await uploadFileToGridFS(buffer, safeFilename, detectedMime)

    return NextResponse.json({ url: `/api/files/${fileId}` }, { status: 201 })
  } catch (error) {
    return handleAuthError(error)
  }
}
