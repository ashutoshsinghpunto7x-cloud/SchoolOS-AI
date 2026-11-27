const MAX_EDGE = 1600;

/** Phone photos are often 3–8 MB; the server accepts 2 MB. Redraws the picture at a
 *  sensible size as a JPEG before upload. */
export async function shrinkPhoto(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(image.naturalWidth * scale);
    canvas.height = Math.round(image.naturalHeight * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('This browser cannot process photos');
    // JPEG has no transparency — paint white first so PNG cut-outs don't turn black.
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not read this photo'))), 'image/jpeg', 0.82)
    );
  } catch {
    throw new Error(`Could not read "${file.name}". Use a JPEG or PNG photo.`);
  } finally {
    URL.revokeObjectURL(url);
  }
}
