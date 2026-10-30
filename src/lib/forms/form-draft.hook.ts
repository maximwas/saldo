import { useEffect, useState } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'
import { useDraftsStore } from '@/store/drafts.store'

async function readDraft(key: string) {
  if (!useDraftsStore.persist.hasHydrated()) {
    await useDraftsStore.persist.rehydrate()
  }

  return useDraftsStore.getState().drafts[key]
}

/** Keeps what the person types under `key` (null: no draft, e.g. an edit) and brings it back when the form opens again.
 * Only typing is saved, not a programmatic setValue or reset; the caller clears the draft once the write is queued. */
export function useFormDraft<Values extends FieldValues>(key: string | null, form: UseFormReturn<Values>) {
  const [restored, setRestored] = useState(false)

  useEffect(() => {
    if (!key) {
      return
    }

    let active = true

    void readDraft(key).then((draft) => {
      if (active && draft && !form.formState.isDirty) {
        form.reset({
          ...form.getValues(),
          ...(draft as Partial<Values>),
        })
        setRestored(true)
      }
    })

    const subscription = form.watch((values, { type }) => {
      if (type === 'change') {
        useDraftsStore.getState().save(key, values)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [key, form])

  return {
    restored,
    discard: () => {
      if (key) {
        useDraftsStore.getState().clear(key)
      }

      form.reset()
      setRestored(false)
    },
  }
}
