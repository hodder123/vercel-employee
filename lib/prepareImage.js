// Client-side image preparation for uploads.
//
// Why this exists:
//  - iPhone photos are HEIC/HEIF. Many browsers can't display that format,
//    and iOS sometimes hands the web a HEIC file (or transcodes it to an
//    oversized JPEG).
//  - Vercel serverless functions reject request bodies larger than ~4.5 MB
//    at the platform level — before our /api/upload code runs — which
//    produces an opaque, non-JSON error response.
//
// Converting and downscaling to a modest JPEG in the browser sidesteps both:
// the upload is small, and the stored photo displays in every browser.

const MAX_DIMENSION = 2200          // longest edge, in pixels
const JPEG_QUALITY = 0.85
const SIZE_THRESHOLD = 3.5 * 1024 * 1024 // re-encode anything approaching the limit

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('decode-failed'))
    img.src = src
  })
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => resolve(blob), type, quality)
      return
    }
    // Fallback for very old browsers without canvas.toBlob.
    try {
      const dataUrl = canvas.toDataURL(type, quality)
      const base64 = dataUrl.split(',')[1]
      const binary = atob(base64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      resolve(new Blob([bytes], { type }))
    } catch {
      resolve(null)
    }
  })
}

/**
 * Returns an upload-ready File. Small, web-friendly images pass through
 * untouched; HEIC/HEIF and large images are decoded and re-encoded as a
 * downscaled JPEG. Throws a clear, user-facing Error if the image cannot
 * be decoded by this browser.
 */
export async function prepareImageForUpload(file) {
  if (!file) return file

  const name = file.name || ''
  const isHeic = /heic|heif/i.test(file.type || '') || /\.(heic|heif)$/i.test(name)
  const isLarge = (file.size || 0) > SIZE_THRESHOLD

  // Small JPG/PNG/WebP — leave as-is so screenshots stay crisp.
  if (!isHeic && !isLarge) return file

  const objectUrl = URL.createObjectURL(file)
  try {
    const img = await loadImage(objectUrl)
    const longestEdge = Math.max(img.naturalWidth, img.naturalHeight) || 1
    const scale = Math.min(1, MAX_DIMENSION / longestEdge)
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)
    if (!blob) return file

    const jpgName = (name.replace(/\.[^.]+$/, '') || 'photo') + '.jpg'
    return new File([blob], jpgName, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    throw new Error(
      "This photo couldn't be processed. Please try a JPG or PNG photo. " +
      'On iPhone you can also switch Settings → Camera → Formats to "Most Compatible".'
    )
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
