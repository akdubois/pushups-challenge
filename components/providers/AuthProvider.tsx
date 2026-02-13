'use client'

import { useAuthInit } from '@/hooks/useAuthInit'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthInit()
  return <>{children}</>
}
