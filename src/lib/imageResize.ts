const MAX_EDGE = 512
const JPEG_QUALITY = 0.82
const SKIP_IF_BYTES = 180_000

/** Reduz foto de perfil para upload e exibição mais rápidos. */
export async function resizeAvatarImage(file: File): Promise<File> {
  if (file.size <= SKIP_IF_BYTES && /jpe?g$/i.test(file.name)) {
    return file
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()

    img.onload = () => {
      URL.revokeObjectURL(url)
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
      const w = Math.max(1, Math.round(img.width * scale))
      const h = Math.max(1, Math.round(img.height * scale))

      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        reject(new Error('canvas'))
        return
      }
      ctx.drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('blob'))
            return
          }
          resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg', lastModified: Date.now() }))
        },
        'image/jpeg',
        JPEG_QUALITY
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('image'))
    }

    img.src = url
  })
}
