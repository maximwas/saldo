'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Camera } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { type ChangeEvent, useRef, useState } from 'react'
import { Avatar } from '@/components/ui/avatar.component'
import { Button } from '@/components/ui/button.component'
import { notify } from '@/components/ui/toaster.component'
import { useLedgerStore } from '@/contexts/ledger.context'
import { MEMBERS_QUERY_ROOT, useMyProfile } from '@/lib/members/members.hook'
import { getBrowserSupabase } from '@/lib/supabase/browser-client'
import { removeAvatar, saveAvatar } from '../api/avatar.api'
import { AVATAR_FILE_TYPES, avatarFileProblem } from '../utils/avatar-file.utils'
import { AvatarEditor, type AvatarSource } from './avatar-editor.component'

// Figma 11:72807 / 59:153000, the name and photo card: the photo 64, the hint, «Change photo» (Secondary S, camera) and
// «Remove photo» (Ghost S, only with a photo). One photo for every space; the file is checked before the editor opens.
export function AvatarField() {
  const translate = useTranslations('settings.myName')
  const translateEditor = useTranslations('settings.avatarEditor')
  const userId = useLedgerStore((ledger) => ledger.userId)
  const myProfile = useMyProfile()
  const queryClient = useQueryClient()
  const input = useRef<HTMLInputElement>(null)
  const [source, setSource] = useState<AvatarSource | null>(null)
  const [removing, setRemoving] = useState(false)

  function choose() {
    input.current?.click()
  }

  function forget(current: AvatarSource | null) {
    if (current?.kind === 'image') {
      URL.revokeObjectURL(current.url)
    }
  }

  function close() {
    forget(source)
    setSource(null)
  }

  function pick(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    // the same file can be picked again after a cancel
    event.target.value = ''

    if (!file) {
      return
    }

    const problem = avatarFileProblem(file)

    forget(source)
    setSource(
      problem
        ? {
            kind: 'problem',
            problem,
          }
        : {
            kind: 'image',
            url: URL.createObjectURL(file),
          },
    )
  }

  async function save(image: Blob) {
    await saveAvatar(getBrowserSupabase(), userId, image)
    await queryClient.invalidateQueries({
      queryKey: [MEMBERS_QUERY_ROOT],
    })
    notify.success(translateEditor('saved'))
    close()
  }

  async function remove() {
    setRemoving(true)

    try {
      await removeAvatar(getBrowserSupabase(), userId)
      await queryClient.invalidateQueries({
        queryKey: [MEMBERS_QUERY_ROOT],
      })
      notify.success(translate('photoRemoved'))
    } catch {
      notify.error(translate('removeFailed'))
    } finally {
      setRemoving(false)
    }
  }

  return (
    // phones put the buttons under the photo and the hint (59:153000): the column dissolves into the wrapping row
    <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
      <Avatar name={myProfile.name} src={myProfile.avatarUrl} size={64} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 max-lg:contents">
        <p className="min-w-0 text-label text-text-secondary max-lg:flex-1">{translate('photoHint')}</p>
        <div className="flex items-center gap-2 max-lg:basis-full">
          <Button variant="secondary" size="s" onClick={choose} className="cursor-pointer max-lg:flex-1">
            <Camera aria-hidden size={16} />
            {translate('changePhoto')}
          </Button>
          {myProfile.avatarUrl ? (
            <Button
              variant="ghost"
              size="s"
              disabled={removing}
              onClick={() => void remove()}
              className="cursor-pointer max-lg:flex-1"
            >
              {translate('removePhoto')}
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={AVATAR_FILE_TYPES.join(',')}
        aria-label={translate('changePhoto')}
        hidden
        onChange={pick}
      />
      {source ? (
        <AvatarEditor
          source={source}
          name={myProfile.name}
          onCloseAction={close}
          onChooseAction={choose}
          onSaveAction={save}
        />
      ) : null}
    </div>
  )
}
