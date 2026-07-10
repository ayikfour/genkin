// Decodes an image file, auto-corrects EXIF rotation (via
// imageOrientation: 'from-image'), downsizes it so its longest edge is
// at most maxDimension, and re-encodes as JPEG — all on native browser
// APIs, no image-compression dependency needed. JPEG (not WebP) for
// broad Safari/PWA compatibility, since canvas.toBlob doesn't reliably
// encode WebP there.
export async function compressImage(
  file: File,
  { maxDimension = 512, quality = 0.82 }: { maxDimension?: number; quality?: number } = {}
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas_context_unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
  if (!blob) throw new Error('image_encode_failed')
  return blob
}
