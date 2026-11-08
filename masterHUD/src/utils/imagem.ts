// Redimensiona pra um quadrado pequeno antes de guardar como base64 no Firestore.
// Documentos do Firestore têm limite de 1MB — uma foto de câmera/celular em tamanho
// original (vários MB) estoura isso fácil, então todo upload de imagem do app passa
// por aqui antes de virar `imagemUrl`.
export function resizeImageToBase64(file: File, size = 200, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = () => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('Canvas indisponível'))
        const lado = Math.min(img.width, img.height)
        const sx = (img.width - lado) / 2
        const sy = (img.height - lado) / 2
        ctx.drawImage(img, sx, sy, lado, lado, 0, 0, size, size)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}
