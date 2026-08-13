export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

function rotateSize(width: number, height: number, rotation: number): { width: number; height: number } {
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  return {
    width: Math.round(width * cos + height * sin),
    height: Math.round(height * cos + width * sin),
  };
}

export async function getCroppedBlob(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation = 0
): Promise<Blob> {
  const img = await loadImage(imageSrc);
  const { width: sourceWidth, height: sourceHeight } = rotateSize(img.naturalWidth, img.naturalHeight, rotation);
  const canvas = document.createElement('canvas');
  canvas.width = croppedAreaPixels.width;
  canvas.height = croppedAreaPixels.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const rad = (rotation * Math.PI) / 180;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(
    img,
    -sourceWidth / 2,
    -sourceHeight / 2,
    sourceWidth,
    sourceHeight
  );
  ctx.restore();

  const cropped = document.createElement('canvas');
  cropped.width = croppedAreaPixels.width;
  cropped.height = croppedAreaPixels.height;
  const croppedCtx = cropped.getContext('2d');
  if (!croppedCtx) throw new Error('Canvas 2D context unavailable');
  croppedCtx.drawImage(
    canvas,
    croppedAreaPixels.x,
    croppedAreaPixels.y,
    croppedAreaPixels.width,
    croppedAreaPixels.height,
    0,
    0,
    croppedAreaPixels.width,
    croppedAreaPixels.height
  );

  return new Promise((resolve, reject) => {
    cropped.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('PNG export failed'));
    }, 'image/png');
  });
}

export async function toPngFile(
  imageSrc: string,
  croppedAreaPixels: Area,
  rotation = 0
): Promise<File> {
  const blob = await getCroppedBlob(imageSrc, croppedAreaPixels, rotation);
  return new File([blob], 'cropped.png', { type: 'image/png' });
}
