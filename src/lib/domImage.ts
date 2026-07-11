import { domToBlob } from 'modern-screenshot'

// Waiting on document.fonts.ready avoids a race where capture fires before
// Geist Variable has finished loading, silently falling back to a system
// font in the exported image.
export async function captureNodeAsPngBlob(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready
  const blob = await domToBlob(node, { type: 'image/png' })
  if (!blob) throw new Error('Failed to capture image')
  return blob
}
