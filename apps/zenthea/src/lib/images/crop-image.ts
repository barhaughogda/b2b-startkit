/**
 * Canvas-based utility to crop an image client-side.
 * Used by the Website Logo upload flow to enforce a fixed 4:1 aspect ratio.
 */

export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates a cropped image blob from a source image and crop area.
 *
 * @param imageSrc - The source image URL (can be a data URL or object URL)
 * @param cropArea - The crop coordinates and dimensions (in pixels)
 * @param outputWidth - Optional desired output width (defaults to crop width)
 * @param mimeType - Output format (default: 'image/png')
 * @param quality - Quality for JPEG output (0-1, default: 0.92)
 * @returns Promise<Blob> - The cropped image as a Blob
 */
export async function cropImage(
  imageSrc: string,
  cropArea: CropArea,
  outputWidth?: number,
  mimeType: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality: number = 0.92
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';

    image.onload = () => {
      // Create canvas with output dimensions
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate output dimensions
      const cropWidth = cropArea.width;
      const cropHeight = cropArea.height;
      const targetWidth = outputWidth || cropWidth;
      const targetHeight = outputWidth
        ? (cropHeight / cropWidth) * outputWidth
        : cropHeight;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      // Draw the cropped portion of the image
      ctx.drawImage(
        image,
        cropArea.x,
        cropArea.y,
        cropWidth,
        cropHeight,
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create image blob'));
          }
        },
        mimeType,
        quality
      );
    };

    image.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };

    image.src = imageSrc;
  });
}

/**
 * Creates an object URL from a File for preview purposes.
 * Remember to revoke it when done using URL.revokeObjectURL()
 */
export function createImagePreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Reads a File as a data URL string.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

