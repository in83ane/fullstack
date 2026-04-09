import mongoose from 'mongoose'
import { GridFSBucket, GridFSBucketReadStream, ObjectId } from 'mongodb'
import { connectDB } from './db'

const BUCKET_NAME = 'uploads'

function getBucket(): GridFSBucket {
  if (!mongoose.connection.db) {
    throw new Error('MongoDB not connected')
  }
  return new GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME })
}

export async function uploadFileToGridFS(
  buffer: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  await connectDB()
  const bucket = getBucket()

  return new Promise((resolve, reject) => {
    const uploadStream = bucket.openUploadStream(filename, {
      metadata: { contentType },
    })

    uploadStream.on('finish', () => {
      resolve(uploadStream.id.toString())
    })
    uploadStream.on('error', reject)
    uploadStream.end(buffer)
  })
}

export async function getFileFromGridFS(
  fileId: string
): Promise<{ stream: GridFSBucketReadStream; contentType: string }> {
  await connectDB()
  const bucket = getBucket()

  const objectId = new ObjectId(fileId)
  const files = await bucket.find({ _id: objectId }).toArray()

  if (!files.length) {
    throw new Error('File not found')
  }

  const file = files[0]
  const stream = bucket.openDownloadStream(objectId)

  return {
    stream,
    contentType: file.metadata?.contentType ?? 'application/octet-stream',
  }
}

export async function deleteFileFromGridFS(fileId: string): Promise<void> {
  await connectDB()
  const bucket = getBucket()
  await bucket.delete(new ObjectId(fileId))
}
