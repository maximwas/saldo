import { Bone, SkeletonCard } from '@/components/ui/skeleton.component'

// Figma frames 41:108089 (desktop) / 2:28961 (mobile): the summary card (a title bar and three tiles, in a row on
// desktop) and the limits card (a title bar and three rows, two on phones). The frame's «not expenses» strip and
// obligations card are left out: the loaded screen does not show them yet.
export function BudgetSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4 lg:gap-6">
      <SkeletonCard className="gap-4 p-5 lg:gap-5 lg:p-6">
        <Bone className="h-5 w-35 rounded-full lg:w-40" />
        <div className="flex flex-col gap-4 lg:flex-row">
          {[0, 1, 2].map((tile) => (
            <Bone key={tile} className="h-16 rounded-inner lg:h-27 lg:flex-1" />
          ))}
        </div>
      </SkeletonCard>
      <SkeletonCard className="gap-5 p-5 lg:p-6">
        <Bone className="h-5 w-24 rounded-full lg:w-50" />
        {[0, 1, 2].map((row) => (
          <div key={row} className="flex items-center gap-3 max-lg:last:hidden">
            <Bone className="size-10 rounded-full" />
            <div className="flex flex-1 flex-col gap-2">
              <Bone className="h-3 self-stretch rounded-full" />
              <Bone className="h-2 w-30 rounded-full lg:w-40" />
            </div>
          </div>
        ))}
      </SkeletonCard>
    </div>
  )
}
