import { Amount } from '@/components/ui/amount.component'
import { Badge } from '@/components/ui/badge.component'
import { Button } from '@/components/ui/button.component'
import { Input } from '@/components/ui/input.component'

// shortcut: phase 0 placeholder showing the first primitives, replaced by Огляд in 0.14
export default function Home() {
  return (
    <main className="mx-auto flex max-w-xl flex-col gap-6 p-8">
      <h1 className="font-display text-page-title">Saldo</h1>
      <div className="flex flex-col gap-4 rounded-card bg-card p-6 shadow-card">
        <Amount value="31 526,48 ₴" symbol="₴" size="xl" />
        <div className="flex flex-wrap items-center gap-3">
          <Amount value="2 708,25 ₴" symbol="₴" kind="plan" />
          <Badge tone="plan">План</Badge>
          <Amount value={null} symbol="₴" />
          <Badge tone="unknown">Сума невідома</Badge>
          <Badge tone="warning">Не підтверджено</Badge>
        </div>
        <Input placeholder="Сума" />
        <div className="flex flex-wrap gap-3">
          <Button>Оплачено</Button>
          <Button variant="secondary">Скасувати</Button>
          <Button variant="ghost" size="s">
            Детальніше
          </Button>
        </div>
      </div>
    </main>
  )
}
