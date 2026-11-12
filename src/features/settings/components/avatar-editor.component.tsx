'use client'

import { Slider } from '@base-ui/react/slider'
import { useFormatter, useTranslations } from 'next-intl'
import { useState } from 'react'
import Cropper, { type Area, type Point } from 'react-easy-crop'
import { Banner } from '@/components/ui/banner.component'
import { Button } from '@/components/ui/button.component'
import { Sheet, SheetClose } from '@/components/ui/sheet.component'
import { notify } from '@/components/ui/toaster.component'
import { cn } from '@/lib/utils/cn.utils'
import type { AvatarFileProblem } from '../utils/avatar-file.utils'

export type AvatarSource =
  | {
      kind: 'image'
      /** an object URL of the picked file */
      url: string
    }
  | {
      kind: 'problem'
      problem: AvatarFileProblem
    }

const OUTPUT_SIZE = 512
const MAX_ZOOM = 3
const CROP_SIZE = {
  width: 240,
  height: 240,
}
// Figma 59:153470: outside the circle dimmed with the scrim, the circle a 2 px ring of the card colour
const CROP_AREA_STYLE = {
  boxShadow: '0 0 0 9999em var(--color-scrim)',
  border: '2px solid var(--color-card)',
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = reject
    image.src = url
  })
}

function canvasBlob(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, 0.9))
}

/** the circle's square of the photo at 512×512. WebP; where the canvas cannot encode it (Safari gives PNG) — JPEG */
async function cropToBlob(url: string, area: Area) {
  const image = await loadImage(url)
  const canvas = document.createElement('canvas')

  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  canvas.getContext('2d')?.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  const webp = await canvasBlob(canvas, 'image/webp')

  if (webp?.type === 'image/webp') {
    return webp
  }

  const jpeg = await canvasBlob(canvas, 'image/jpeg')

  if (!jpeg) {
    throw new Error('Canvas export failed')
  }

  return jpeg
}

type CropPreviewProps = {
  url: string
  /** the crop in % of the photo */
  area: Area | null
  size: 'size-16' | 'size-8'
}

// The crop as it will be saved: the photo scaled so the crop's width fills the circle (react-easy-crop's preview recipe)
function CropPreview({ url, area, size }: CropPreviewProps) {
  const scale = area ? 100 / area.width : 1

  return (
    <span aria-hidden className={cn('relative shrink-0 overflow-hidden rounded-full bg-card', size)}>
      {area ? (
        // biome-ignore lint/performance/noImgElement: an object URL of the picked file, drawn by a transform
        <img
          src={url}
          alt=""
          className="absolute top-0 left-0 w-full max-w-none origin-top-left"
          style={{
            transform: `translate(${-area.x * scale}%, ${-area.y * scale}%) scale(${scale})`,
          }}
        />
      ) : null}
    </span>
  )
}

type ImageCropProps = {
  url: string
  name: string
  onPixelsAction: (pixels: Area) => void
}

// Figma 59:153463: the crop area (432×300 on desktop, radius md, the 240 circle), the hint, the zoom slider
// (1× to 3×; arrow keys on the thumb, pinch and wheel on the photo), the preview at 64 and 32 with the name
function ImageCrop({ url, name, onPixelsAction }: ImageCropProps) {
  const translate = useTranslations('settings.avatarEditor')
  const [crop, setCrop] = useState<Point>({
    x: 0,
    y: 0,
  })
  const [zoom, setZoom] = useState(1)
  const [area, setArea] = useState<Area | null>(null)

  function changeArea(percentages: Area, pixels: Area) {
    setArea(percentages)
    onPixelsAction(pixels)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-75 overflow-hidden rounded-md bg-subtle">
        <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          maxZoom={MAX_ZOOM}
          aspect={1}
          cropShape="round"
          cropSize={CROP_SIZE}
          objectFit="cover"
          showGrid={false}
          style={{
            cropAreaStyle: CROP_AREA_STYLE,
          }}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropAreaChange={changeArea}
        />
      </div>
      <p className="text-center text-label text-text-secondary">{translate('dragHint')}</p>
      <Slider.Root
        value={zoom}
        min={1}
        max={MAX_ZOOM}
        step={0.05}
        onValueChange={(value) => setZoom(Array.isArray(value) ? (value[0] ?? 1) : value)}
        className="flex items-center gap-3"
      >
        <Slider.Label className="text-label font-medium text-text-primary">{translate('zoom')}</Slider.Label>
        <Slider.Control className="flex h-6 flex-1 cursor-pointer items-center">
          <Slider.Track className="relative h-1 w-full rounded-full bg-border">
            <Slider.Indicator className="rounded-full bg-primary" />
            <Slider.Thumb className="size-5 rounded-full border border-border bg-card shadow-card outline-none after:absolute after:-inset-3 focus-visible:ring-2 focus-visible:ring-primary" />
          </Slider.Track>
        </Slider.Control>
      </Slider.Root>
      <div className="flex flex-col gap-3 rounded-md bg-subtle p-4">
        <p className="text-caption font-medium text-text-tertiary">{translate('preview')}</p>
        <div className="flex items-center gap-6">
          <CropPreview url={url} area={area} size="size-16" />
          <span className="flex min-w-0 items-center gap-3">
            <CropPreview url={url} area={area} size="size-8" />
            <span className="truncate text-label font-semibold text-text-primary">{name}</span>
          </span>
        </div>
      </div>
    </div>
  )
}

type AvatarEditorProps = {
  source: AvatarSource
  /** the person's name under the small preview */
  name: string
  onCloseAction: () => void
  /** «Choose a photo» after a refused file: the file picker again */
  onChooseAction: () => void
  /** saves and closes; a throw keeps the editor open */
  onSaveAction: (image: Blob) => Promise<void>
}

// Figma section 59:153077 (avatar and account): the profile photo editor as a Dialog (480, 59:153078) or a BottomSheet
// (59:153510); a refused file shows the reason instead of the photo (59:153687 / 59:154092) and offers another pick
export function AvatarEditor({ source, name, onCloseAction, onChooseAction, onSaveAction }: AvatarEditorProps) {
  const translate = useTranslations('settings.avatarEditor')
  const formatter = useFormatter()
  const [pixels, setPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (source.kind !== 'image' || !pixels) {
      return
    }

    setSaving(true)

    try {
      await onSaveAction(await cropToBlob(source.url, pixels))
    } catch {
      notify.error(translate('saveFailed'))
      setSaving(false)
    }
  }

  function problemText(problem: AvatarFileProblem) {
    return problem.kind === 'tooBig'
      ? translate('tooBig', {
          size: formatter.number(problem.sizeMb, {
            maximumFractionDigits: 1,
          }),
        })
      : translate('notImage')
  }

  const footer =
    source.kind === 'image' ? (
      <>
        <SheetClose>{translate('cancel')}</SheetClose>
        <Button disabled={!pixels || saving} onClick={() => void save()}>
          {translate('save')}
        </Button>
      </>
    ) : (
      <>
        <SheetClose>{translate('cancel')}</SheetClose>
        <Button onClick={onChooseAction}>{translate('choose')}</Button>
      </>
    )

  return (
    <Sheet
      open
      onOpenChange={(open) => (open ? undefined : onCloseAction())}
      title={translate('title')}
      footer={footer}
    >
      {source.kind === 'image' ? (
        <ImageCrop key={source.url} url={source.url} name={name} onPixelsAction={setPixels} />
      ) : (
        <Banner kind="danger" role="alert">
          {problemText(source.problem)}
        </Banner>
      )}
    </Sheet>
  )
}
