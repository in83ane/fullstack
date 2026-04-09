export async function uploadWorkPhoto(
  file: File,
  workId: string,
  type: 'start' | 'complete'
): Promise<string> {
  const formData = new FormData()
  formData.append('file', file, `${workId}_${type}_${Date.now()}.${file.name.split('.').pop()}`)

  const res = await fetch('/api/files', {
    method: 'POST',
    body: formData,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? 'Upload failed')
  }

  const { url } = await res.json()
  return url as string
}
