'use client'

import { useAnimate, useReducedMotion } from 'motion/react'
import { usePathname } from 'next/navigation'
import { useLayoutEffect, useRef, useSyncExternalStore } from 'react'
import { MOTION } from '@/constants/motion.constants'

type PageTransitionProps = {
  className?: string
  children: React.ReactNode
}

const subscribeNever = () => () => {}

// Enter-only: the new page fades in and rises a little; the shell around it stays still. No exit animation:
// AnimatePresence cannot see App Router pages leave without the internal LayoutRouterContext ("FrozenRouter"), which
// breaks on Next updates. The wrapper is not keyed, so the router subtree is never remounted.
export function PageTransition({ className, children }: PageTransitionProps) {
  const pathname = usePathname()
  const [scope, animate] = useAnimate<HTMLDivElement>()
  const reduceMotion = useReducedMotion()
  // false while hydrating server HTML: that first paint is already on screen and must not blink
  const isClientRender = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  )
  const animatedPathname = useRef(isClientRender ? null : pathname)

  // layout effect: the first frame of a new page is painted already faded out, not at full opacity
  useLayoutEffect(() => {
    if (animatedPathname.current === pathname) {
      return
    }

    animatedPathname.current = pathname
    animate(
      scope.current,
      reduceMotion
        ? { opacity: [0, 1] }
        : {
            opacity: [0, 1],
            y: [MOTION.pageOffsetY, 0],
          },
    )
  }, [pathname, animate, scope, reduceMotion])

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  )
}
