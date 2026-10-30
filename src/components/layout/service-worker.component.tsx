'use client'

import { SerwistProvider } from '@serwist/turbopack/react'

// spike 0.16: registers /serwist/sw.js so the visited shell opens offline; off in dev, where Turbopack rebuilds
export function ServiceWorker({ children }: { children: React.ReactNode }) {
  return (
    <SerwistProvider swUrl="/serwist/sw.js" disable={process.env.NODE_ENV === 'development'}>
      {children}
    </SerwistProvider>
  )
}
