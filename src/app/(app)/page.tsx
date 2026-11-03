import { DynamicMarker } from '@/components/layout/dynamic-marker.component'
import { RatesCard } from '@/features/currencies/components/rates-card.component'
import { RatesStrip } from '@/features/currencies/components/rates-strip.component'
import { OverviewScreen } from '@/features/overview/components/overview-screen.component'

export default function OverviewPage() {
  return (
    <>
      <OverviewScreen ratesCard={<RatesCard />} ratesStrip={<RatesStrip />} />
      <DynamicMarker />
    </>
  )
}
