'use client'

import { useEffect, useState } from 'react'

interface StrengthResult {
  score: number
  feedback: { warning: string; suggestions: string[] }
}

const LABELS = ['ไม่ปลอดภัย', 'ความเสี่ยงสูง', 'พอใช้', 'แข็งแกร่ง', 'แน่นหนามาก']
const COLORS = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500']

interface Props {
  password: string
}

export default function PasswordStrengthMeter({ password }: Props) {
  const [result, setResult] = useState<StrengthResult | null>(null)

  useEffect(() => {
    if (!password) {
      setResult(null)
      return
    }

    // Lazy load zxcvbn only when user starts typing
    import('zxcvbn').then((mod) => {
      const zxcvbn = mod.default
      setResult(zxcvbn(password))
    })
  }, [password])

  if (!result || !password) return null

  const { score } = result

  return (
    <div className="space-y-1.5 mt-1.5">
      <div className="flex gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i <= score ? COLORS[score] : 'bg-gray-200'
            }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${score <= 1 ? 'text-red-600' : score <= 2 ? 'text-yellow-600' : 'text-green-600'}`}>
        รหัสผ่านของคุณ {LABELS[score]}
      </p>
    </div>
  )
}
