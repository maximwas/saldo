'use client'

import { motion, useReducedMotion } from 'motion/react'
import { type KeyboardEvent, type PointerEvent, type Ref, useRef, useState } from 'react'
import { MOTION } from '@/constants/motion.constants'

type Point = {
  x: number
  y: number
}

type Drop = {
  id: number
  left: number
  top: number
  size: number
}

type RippleLayerProps = {
  ref: Ref<HTMLSpanElement>
  drops: Drop[]
  onDoneAction: (id: number) => void
}

function RippleLayer({ ref, drops, onDoneAction }: RippleLayerProps) {
  return (
    <span ref={ref} aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {drops.map((drop) => (
        <motion.span
          key={drop.id}
          initial={{
            scale: 0,
            opacity: 1,
          }}
          animate={{
            scale: 1,
            opacity: 0,
          }}
          transition={{
            duration: MOTION.duration.ripple,
            ease: MOTION.ease.standard,
          }}
          onAnimationComplete={() => onDoneAction(drop.id)}
          className="absolute rounded-full bg-text-primary/10"
          style={{
            left: drop.left,
            top: drop.top,
            width: drop.size,
            height: drop.size,
          }}
        />
      ))}
    </span>
  )
}

// a circle centred on the press point (the centre of the box without one), big enough to reach the farthest corner
function dropAt(id: number, box: DOMRect, point: Point | null): Drop {
  const originX = point ? point.x - box.left : box.width / 2
  const originY = point ? point.y - box.top : box.height / 2
  const radius = Math.hypot(Math.max(originX, box.width - originX), Math.max(originY, box.height - originY))

  return {
    id,
    left: originX - radius,
    top: originY - radius,
    size: radius * 2,
  }
}

// Enter / Space on the element itself (not on a control inside it)
const isActivation = (event: KeyboardEvent<HTMLElement>) =>
  (event.key === 'Enter' || event.key === ' ') && !event.repeat && event.target === event.currentTarget

/**
 * Tap feedback for a clickable row: a circle grows from the press point (the centre for Enter / Space) and fades out.
 * Spread `pressProps` on the clickable element and render `ripple` inside it. The layer is absolutely positioned, so the
 * nearest positioned ancestor (the element itself, or a row it stretches over) must be `relative`; hover stays a
 * `hover:bg-subtle` class, only the ripple is switched off under prefers-reduced-motion.
 */
export function useRipple() {
  const layer = useRef<HTMLSpanElement>(null)
  const nextId = useRef(0)
  const reduced = useReducedMotion()
  const [drops, setDrops] = useState<Drop[]>([])

  function start(point: Point | null) {
    // the layer's box is the clickable element, or the positioned row it stretches over
    const box = layer.current?.getBoundingClientRect()

    if (!box) {
      return
    }

    nextId.current += 1
    setDrops((current) => [...current, dropAt(nextId.current, box, point)])
  }

  const pressProps = {
    onPointerDown: (event: PointerEvent<HTMLElement>) =>
      reduced
        ? undefined
        : start({
            x: event.clientX,
            y: event.clientY,
          }),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!reduced && isActivation(event)) {
        start(null)
      }
    },
  }

  const ripple = (
    <RippleLayer
      ref={layer}
      drops={drops}
      onDoneAction={(id) => setDrops((current) => current.filter((drop) => drop.id !== id))}
    />
  )

  return {
    pressProps,
    ripple,
  }
}
