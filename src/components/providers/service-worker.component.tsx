'use client'

import { SerwistProvider } from '@serwist/turbopack/react'

// Registers /serwist/sw.js so visited pages open offline; off in dev, where Turbopack rebuilds. No reload when the
// network comes back (Serwist's default): the write queue resumes by itself, and a reload would cut its requests short
export function ServiceWorker({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'} reloadOnOnline={false}>
      {children}
    </SerwistProvider>
  )
}
