async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-1', data) // NOSONAR
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

export async function checkPwnedPassword(password: string): Promise<number> {
  try {
    const hash = await sha1(password)
    const prefix = hash.slice(0, 5)
    const suffix = hash.slice(5)

    const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      headers: { 'Add-Padding': 'true' },
    })

    if (!res.ok) return 0

    const text = await res.text()
    const lines = text.split('\n')

    for (const line of lines) {
      const [hashSuffix, countStr] = line.split(':')
      if (hashSuffix.trim().toUpperCase() === suffix) {
        return parseInt(countStr.trim(), 10)
      }
    }

    return 0
  } catch {
    // Network error — fail open (don't block registration)
    return 0
  }
}
