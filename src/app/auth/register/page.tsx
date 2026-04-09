'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { z } from 'zod'

import { checkPwnedPassword } from '@/frontend/lib/pwnedPassword'
import dynamic from 'next/dynamic'

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน')
    .max(200, 'ชื่อ-นามสกุลของท่านมีความยาวเกินไป')
    .regex(/^[\u0E00-\u0E7Fa-zA-Z\s'-]+$/, 'กรุณากรอกตัวอักษรไทยหรืออังกฤษเท่านั้น'),
  email: z.string().trim().min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน').email('กรุณากรอกอีเมลให้ถูกต้อง').max(200, 'กรุณากรอกอีเมลให้ถูกต้อง'),
  password: z
    .string()
    .min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน')
    .min(15, 'รหัสผ่านต้องมีอย่างน้อย 15 ตัวอักษร')
    .max(128, 'รหัสผ่านของท่านมีจำนวนยาวเกินไป'),
  confirmPassword: z
    .string()
    .min(1, 'กรุณากรอกข้อมูลให้ครบถ้วน'),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'รหัสผ่านไม่ตรงกัน',
  path: ['confirmPassword'],
})

const PasswordStrengthMeter = dynamic(
  () => import('@/frontend/components/PasswordStrengthMeter'),
  { ssr: false }
)

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<'fullName' | 'email' | 'password' | 'confirmPassword', string>>>({})
  const [loading, setLoading] = useState(false)
  const [pwnedCount, setPwnedCount] = useState<number | null>(null)
  const pwnedTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced pwned password check
  useEffect(() => {
    if (pwnedTimer.current) clearTimeout(pwnedTimer.current)
    setPwnedCount(null)

    if (password.length < 4) return

    pwnedTimer.current = setTimeout(async () => {
      const count = await checkPwnedPassword(password)
      setPwnedCount(count)
    }, 500)

    return () => {
      if (pwnedTimer.current) clearTimeout(pwnedTimer.current)
    }
  }, [password])

  const handleRegister = async () => {
    setError(null)
    setFieldErrors({})

    const result = registerSchema.safeParse({ fullName, email, password, confirmPassword })
    if (!result.success) {
      const hasRequired = result.error.issues.some((i) => i.message === 'กรุณากรอกข้อมูลให้ครบถ้วน')
      if (hasRequired) {
        setError('กรุณากรอกข้อมูลให้ครบถ้วน')
        return
      }
      const errs: typeof fieldErrors = {}
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof typeof errs
        if (!errs[field]) errs[field] = issue.message
      }
      setFieldErrors(errs)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'Registration failed')
        return
      }

      window.location.href = `/auth/pending?email=${encodeURIComponent(email)}`
    } catch {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleRegister = () => {
    window.location.href = '/api/auth/google'
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRegister()
  }

  return (
    <main className="min-h-dvh grid place-items-center p-6 bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gray-900 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">สมัครสมาชิก</h1>
          <p className="text-sm text-gray-500 mt-1">สร้างบัญชีใหม่เพื่อใช้งานระบบ</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">ชื่อ-นามสกุล</label>
              <input
                id="fullName"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ชื่อ นามสกุล"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${fieldErrors.fullName ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-gray-900'}`}
              />
              {fieldErrors.fullName && <p className="text-xs text-red-500">{fieldErrors.fullName}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">อีเมล</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="your@email.com"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${fieldErrors.email ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-gray-900'}`}
              />
              {fieldErrors.email && <p className="text-xs text-red-500">{fieldErrors.email}</p>}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                รหัสผ่าน
                <span className="text-gray-400 font-normal ml-1">(อย่างน้อย 15 ตัวอักษร)</span>
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${fieldErrors.password ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-gray-900'}`}
              />
              {fieldErrors.password && <p className="text-xs text-red-500">{fieldErrors.password}</p>}
              <PasswordStrengthMeter password={password} />

              {/* Pwned password check */}
              {pwnedCount !== null && password.length >= 4 && (
                pwnedCount > 0 ? (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
                    <svg className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                    <p className="text-xs text-red-600">
                      พบรหัสผ่านนี้ในเหตุการณ์ข้อมูลรั่วไหลกว่า {pwnedCount.toLocaleString()} ครั้ง
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-xs text-green-600">รหัสผ่านนี้ไม่พบประวัติการรั่วไหล</p>
                  </div>
                )
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">ยืนยันรหัสผ่าน</label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="••••••••"
                className={`w-full px-3.5 py-2.5 text-sm rounded-xl border bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all placeholder:text-gray-300 ${fieldErrors.confirmPassword ? 'border-red-300 focus:ring-red-400' : 'border-gray-200 focus:ring-gray-900'}`}
              />
              {fieldErrors.confirmPassword && <p className="text-xs text-red-500">{fieldErrors.confirmPassword}</p>}
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
              <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 active:bg-gray-950 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                กำลังสมัคร...
              </span>
            ) : 'สมัครสมาชิก'}
          </button>

          <p className="text-center text-sm text-gray-500">
            มีบัญชีแล้ว?{' '}
            <Link href="/auth/login" className="text-gray-900 font-medium hover:underline">เข้าสู่ระบบ</Link>
          </p>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white text-gray-400">หรือ</span>
            </div>
          </div>

          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            สมัครด้วย Google
          </button>
        </div>
      </div>
    </main>
  )
}
