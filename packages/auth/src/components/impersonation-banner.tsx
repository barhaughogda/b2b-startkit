'use client'

import { useAuth } from '../hooks/use-auth'
import { useEffect, useState } from 'react'

/**
 * Impersonation banner component
 * Shows a visible banner when a superadmin is impersonating a user
 *
 * @example
 * <ImpersonationBanner />
 */
export function ImpersonationBanner() {
  const { user, isImpersonating } = useAuth()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    setIsVisible(isImpersonating)
  }, [isImpersonating])

  if (!isVisible || !user) {
    return null
  }

  const handleEndImpersonation = async () => {
    try {
      const response = await fetch('/api/admin/impersonate', {
        method: 'DELETE',
      })

      if (response.ok) {
        // Reload page to clear impersonation session
        window.location.reload()
      } else {
        console.error('Failed to end impersonation')
      }
    } catch (error) {
      console.error('Error ending impersonation:', error)
    }
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-black px-4 py-2 text-center text-sm font-medium">
      <div className="flex items-center justify-center gap-4">
        <span>
          ⚠️ You are impersonating <strong>{user.email}</strong>
        </span>
        <button
          onClick={handleEndImpersonation}
          className="px-3 py-1 bg-black text-white rounded hover:bg-gray-800 transition-colors"
        >
          End Impersonation
        </button>
      </div>
    </div>
  )
}
