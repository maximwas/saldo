import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'

// Figma frame 2:28961 (mobile loading): the summary card (a title bar and three blocks) and the limits card (a title
// bar and two rows); desktop takes the same cards
export function BudgetSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <SkeletonCard className="gap-4 p-5">
        <Bone className="h-5 w-35 rounded-full" />
        <Bone className="h-16 self-stretch rounded-inner" />
        <Bone className="h-16 self-stretch rounded-inner" />
        <Bone className="h-16 self-stretch rounded-inner" />
      </SkeletonCard>
      <SkeletonCard className="gap-5 p-5">
        <Bone className="h-5 w-24 rounded-full" />
        {[0, 1].map((row) => (
          <div key={row} className="flex items-center gap-3">
            <Bone className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-3 self-stretch rounded-full" />
              <Bone className="h-2 w-30 rounded-full" />
            </div>
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}
