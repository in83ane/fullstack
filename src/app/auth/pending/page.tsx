import { Suspense } from 'react'
import PendingContent from './pending-content'

export const dynamic = 'force-dynamic'

export default function PendingPage() {
  return (
    <Suspense fallback={
      <main className="min-h-dvh grid place-items-center p-6 bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          <p className="text-gray-600">กำลังโหลด...</p>
        </div>
      </main>
    }>
      <PendingContent />
    </Suspense>
  )
}
