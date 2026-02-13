import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/store/useAuthStore'

export function useAuthInit() {
  const { initialize, isInitialized } = useAuthStore()
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only initialize once, even if component remounts
    if (!hasInitialized.current && !isInitialized) {
      hasInitialized.current = true
      initialize()
    }
  }, [initialize, isInitialized])

  return { isInitialized }
}
