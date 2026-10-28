const maxSourceBytes = 20 * 1024 * 1024;
const maxUploadBytes = 1024 * 1024;
const maxDimension = 1920;

export function validatePhotoFile(file: File): string {
  const supported = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    || ((!file.type || file.type === 'application/octet-stream') && /\.(jpe?g|png|webp)$/i.test(file.name));
  return !supported || !file.size || file.size > maxSourceBytes ? 'Выберите JPEG, PNG или WebP до 20 МБ каждый.' : '';
}

// Decode locally, then upload only a bounded JPEG. Never fall back to sending the original.
export async function preparePhoto(file: File): Promise<Blob> {
  const validation = validatePhotoFile(file);
  if (validation) throw new Error(validation);
  const url = URL.createObjectURL(file);
  const image = new Image();
  const canvas = document.createElement('canvas');
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Не удалось открыть фото. Попробуйте сохранить его заново в JPEG или PNG.')), 30000);
      image.onload = () => { clearTimeout(timer); resolve(); };
      image.onerror = () => { clearTimeout(timer); reject(new Error('Не удалось открыть фото. Сохраните его в JPEG или PNG.')); };
      image.src = url;
    });
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('Не удалось определить размер фотографии.');
    // HTMLImageElement applies the photo's orientation before drawing in modern browsers.
    const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
    let width = Math.max(1, Math.round(image.naturalWidth * scale));
    let height = Math.max(1, Math.round(image.naturalHeight * scale));
    for (let attempt = 0; attempt < 6; attempt++) {
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Браузер не смог обработать фото. Попробуйте загрузить его в другом браузере.');
      // Workplace photos become JPEG; composite transparent pixels on white.
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);
      const result = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Не удалось сжать фотографию.')), 'image/jpeg', 0.82);
      });
      if (result.type !== 'image/jpeg') throw new Error('Браузер не поддерживает подготовку JPEG. Попробуйте другой браузер.');
      if (result.size > 0 && result.size <= maxUploadBytes) return result;
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
    throw new Error('Не удалось уменьшить фото до 1 МБ. Выберите другое изображение.');
  } finally {
    image.onload = image.onerror = null;
    image.removeAttribute('src');
    URL.revokeObjectURL(url);
    canvas.width = canvas.height = 0;
  }
}
