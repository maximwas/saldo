import { cn } from '@/lib/utils/cn.utils'

type StatTableProps = {
  caption: string
  headers: {
    label: string
    /** numbers sit on the right */
    end?: boolean
  }[]
  rows: {
    key: string
    cells: React.ReactNode[]
  }[]
  /** the «Total» row: one cell per header */
  footer?: React.ReactNode[]
}

// Figma «Saldo» → Statistics 2:77703: header in caption text-secondary, rows with a border-bottom, a bold total row.
// The table is the equivalent of every chart (§20): the same figures, readable without colour.
export function StatTable({ caption, headers, rows, footer }: StatTableProps) {
  const align = (index: number) => (headers[index]?.end ? 'text-right' : 'text-left')

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-label tabular-nums">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="text-caption text-text-secondary">
            {headers.map((header, index) => (
              <th key={header.label} scope="col" className={cn('px-2 py-2 font-normal', align(index))}>
                {header.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-t border-border">
              {row.cells.map((cell, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional, one per header
                <td key={index} className={cn('px-2 py-3', align(index))}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        {footer && (
          <tfoot>
            <tr className="border-t border-border-strong font-semibold">
              {footer.map((cell, index) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: cells are positional, one per header
                <td key={index} className={cn('px-2 py-3', align(index))}>
                  {cell}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  )
}
