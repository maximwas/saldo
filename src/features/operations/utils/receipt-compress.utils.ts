export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024
const MAX_SIDE = 1600
const JPEG_QUALITY = 0.8

export const isReceiptType = (type: string) => type === 'application/pdf' || type.startsWith('image/')

/** a photo shrinks to 1600 px and JPEG 0.8 before it leaves the browser (architecture §6); a PDF goes as it is */
export async function compressReceipt(file: File): Promise<Blob> {
  if (file.type === 'application/pdf') {
    return file
  }

  const { default: Compressor } = await import('compressorjs')

  return new Promise<Blob>((resolve, reject) => {
    new Compressor(file, {
      maxWidth: MAX_SIDE,
      maxHeight: MAX_SIDE,
      quality: JPEG_QUALITY,
      mimeType: 'image/jpeg',
      success: resolve,
      error: reject,
    })
  })
}
