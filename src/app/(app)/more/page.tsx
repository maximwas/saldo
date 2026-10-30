import type { Route } from 'next'
import Link from 'next/link'
import { MORE_SECTIONS } from '@/constants/navigation.constants'

// mobile More page (spec §2) lists the sections the TabBar has no room for, as NavItem 2:8110 rows (gap 4 as in
// Sidebar); Figma has no More screen yet
export default function MorePage() {
  return (
    <nav className="flex flex-col gap-1">
      {MORE_SECTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href as Route}
          className="flex h-11 items-center gap-3 rounded-md px-3 text-body font-medium text-text-secondary outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Icon aria-hidden size={20} className="shrink-0" />
          <span className="flex-1 truncate">{label}</span>
        </Link>
      ))}
    </nav>
  )
}
