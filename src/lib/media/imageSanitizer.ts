/**
 * NAFAS Client-Side Image Metadata & EXIF Sanitizer
 * 
 * Strips camera model, GPS coordinates, timestamps, and device fingerprints
 * by re-encoding raster image pixels onto an off-screen HTML5 Canvas.
 * Operates purely client-side before any network payload is transmitted.
 */

export interface SanitizeImageResult {
  file: File;
  stripped: boolean;
  originalSizeBytes: number;
  sanitizedSizeBytes: number;
  width: number;
  height: number;
  mimeType: string;
}

/**
 * Checks if a byte buffer contains JPEG EXIF marker (0xFF, 0xE1)
 */
export function hasJpegExifMarker(buffer: ArrayBuffer | Uint8Array): boolean {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return false; // Not a valid JPEG
  }

  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xFF) {
      offset++;
      continue;
    }
    const marker = bytes[offset + 1];
    // 0xFFE1 is APP1 (EXIF / XMP)
    if (marker === 0xE1) {
      return true;
    }
    // Stop at Start of Scan (0xFFDA)
    if (marker === 0xDA) {
      break;
    }
    // Skip to next marker using length bytes
    if (offset + 3 < bytes.length) {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      offset += 2 + length;
    } else {
      break;
    }
  }

  return false;
}

/**
 * Strips all metadata from an image File using Canvas pixel extraction.
 * Preserves high visual quality (0.92 compression) while guaranteeing
 * that all EXIF, GPS, and hardware tags are completely discarded.
 */
export async function stripImageMetadata(file: File, quality = 0.92): Promise<SanitizeImageResult> {
  const originalSizeBytes = file.size;

  // Fallback for non-browser or unsupported environments
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      file,
      stripped: false,
      originalSizeBytes,
      sanitizedSizeBytes: originalSizeBytes,
      width: 0,
      height: 0,
      mimeType: file.type
    };
  }

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    return {
      file,
      stripped: false,
      originalSizeBytes,
      sanitizedSizeBytes: originalSizeBytes,
      width: 0,
      height: 0,
      mimeType: file.type
    };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      try {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({
            file,
            stripped: false,
            originalSizeBytes,
            sanitizedSizeBytes: originalSizeBytes,
            width,
            height,
            mimeType: file.type
          });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Keep PNG as PNG to preserve transparency; encode JPEG and WebP cleanly
        const outputMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
        const exportQuality = file.type === 'image/png' ? undefined : quality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                stripped: false,
                originalSizeBytes,
                sanitizedSizeBytes: originalSizeBytes,
                width,
                height,
                mimeType: file.type
              });
              return;
            }

            const cleanFileName = file.name.replace(/\.[^/.]+$/, '') + (outputMime === 'image/png' ? '.png' : '.jpg');
            const sanitizedFile = new File([blob], cleanFileName, {
              type: outputMime,
              lastModified: Date.now()
            });

            resolve({
              file: sanitizedFile,
              stripped: true,
              originalSizeBytes,
              sanitizedSizeBytes: sanitizedFile.size,
              width,
              height,
              mimeType: outputMime
            });
          },
          outputMime,
          exportQuality
        );
      } catch (_) {
        resolve({
          file,
          stripped: false,
          originalSizeBytes,
          sanitizedSizeBytes: originalSizeBytes,
          width: 0,
          height: 0,
          mimeType: file.type
        });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({
        file,
        stripped: false,
        originalSizeBytes,
        sanitizedSizeBytes: originalSizeBytes,
        width: 0,
        height: 0,
        mimeType: file.type
      });
    };

    img.src = objectUrl;
  });
}
