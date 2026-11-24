import { describe, it, expect } from 'vitest';
import { hasJpegExifMarker, stripImageMetadata } from '../src/lib/media/imageSanitizer';

describe('EXIF Privacy & Client-Side Image Sanitizer', () => {
  it('should correctly identify synthetic JPEG buffer containing APP1 EXIF marker', () => {
    // Construct a synthetic JPEG header: 0xFF, 0xD8 (SOI), followed by 0xFF, 0xE1 (APP1/EXIF)
    const exifJpeg = new Uint8Array([
      0xFF, 0xD8, // SOI
      0xFF, 0xE1, // APP1 marker (EXIF)
      0x00, 0x0A, // Length: 10 bytes
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, 0x00, 0x00, // "Exif\0\0"
      0xFF, 0xDA  // SOS
    ]);

    expect(hasJpegExifMarker(exifJpeg.buffer)).toBe(true);
  });

  it('should return false for clean JPEG without APP1 EXIF marker', () => {
    // Construct a clean JFIF JPEG: 0xFF, 0xD8 (SOI), 0xFF, 0xE0 (APP0/JFIF), 0xFF, 0xDA (SOS)
    const cleanJpeg = new Uint8Array([
      0xFF, 0xD8, // SOI
      0xFF, 0xE0, // APP0 (JFIF)
      0x00, 0x08, // Length: 8 bytes
      0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, // "JFIF\0"
      0xFF, 0xDA  // SOS
    ]);

    expect(hasJpegExifMarker(cleanJpeg.buffer)).toBe(false);
  });

  it('should return false for non-JPEG buffers (PNG / binary)', () => {
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
    expect(hasJpegExifMarker(pngHeader.buffer)).toBe(false);
  });

  it('should handle non-browser execution gracefully by returning original file without error', async () => {
    const dummyFile = new File([new Uint8Array([1, 2, 3])], 'test-image.jpg', { type: 'image/jpeg' });
    const result = await stripImageMetadata(dummyFile);
    expect(result.file).toBeDefined();
    expect(result.originalSizeBytes).toBe(3);
    // In node/vitest environment without HTML5 Canvas, it handles safely without throwing
    expect(result.mimeType).toBe('image/jpeg');
  });

  it('should reject or pass through non-whitelisted file types safely', async () => {
    const txtFile = new File(['plain text'], 'document.txt', { type: 'text/plain' });
    const result = await stripImageMetadata(txtFile);
    expect(result.stripped).toBe(false);
    expect(result.file.name).toBe('document.txt');
  });
});
