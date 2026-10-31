import { cn } from '@/lib/utils/cn.utils'

type BoneProps = {
  className?: string
}

type SkeletonLineProps = {
  /** width class of the short bar at the end, e.g. w-24 */
  end?: string
}

// Figma «Saldo» loading frames (5:89183, 5:103704, 2:56714): placeholders in the subtle fill on white cards; each
// screen sets the sizes and radii of its own frame
export function Bone({ className }: BoneProps) {
  return <span aria-hidden className={cn('block shrink-0 bg-subtle', className)} />
}

export function SkeletonCard({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col rounded-card bg-card shadow-card', className)} {...props} />
}

/** a placeholder row: a 40 circle, a line that fills the row and, when given, a short one at the end (gap 16) */
export function SkeletonLine({ end }: SkeletonLineProps) {
  return (
    <div className="flex items-center gap-4">
      <Bone className="size-10 rounded-full" />
      <Bone className="h-4 flex-1 rounded-sm" />
      {end ? <Bone className={cn('h-4 rounded-sm', end)} /> : null}
    </div>
  )
}
