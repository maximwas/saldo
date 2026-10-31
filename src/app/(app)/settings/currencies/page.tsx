import { DynamicMarker } from '@/components/layout/dynamic-marker.component'
import { CurrenciesScreen } from '@/features/currencies/components/currencies-screen.component'

export default function CurrenciesPage() {
  return (
    <>
      <CurrenciesScreen />
      <DynamicMarker />
    </>
  )
}
