'use client'

import { SerwistProvider } from '@serwist/turbopack/react'

// Registers /serwist/sw.js so visited pages open offline; off in dev, where Turbopack rebuilds
export function ServiceWorker({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'}>
      {children}
    </SerwistProvider>
  )
}
