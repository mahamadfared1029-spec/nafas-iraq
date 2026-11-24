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

describe('TASK 2 — Browser-Level EXIF Sanitization & Fail-Closed Protection', () => {
  it('should strip EXIF metadata from JPEG containing GPS tags via simulated Canvas re-encoding', async () => {
    // 1. Construct real JPEG containing APP1 EXIF segment with GPS data
    const exifWithGps = new Uint8Array([
      0xFF, 0xD8, // SOI
      0xFF, 0xE1, // APP1 marker
      0x00, 0x1E, // Length: 30 bytes
      0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
      0x49, 0x49, 0x2A, 0x00, // TIFF little-endian
      0x08, 0x00, 0x00, 0x00,
      0x01, 0x00, 0x25, 0x88, 0x04, 0x00, 0x01, 0x00, 0x00, 0x00, // GPSInfo IFD tag (0x8825)
      0x1A, 0x00, 0x00, 0x00,
      0xFF, 0xDA, // SOS
      0x00, 0x00, 0xFF, 0xD9 // EOI
    ]);

    expect(hasJpegExifMarker(exifWithGps.buffer)).toBe(true);

    const inputFile = new File([exifWithGps], 'gps_camera_evidence.jpg', { type: 'image/jpeg' });

    // 2. Setup browser DOM simulation with Mock Image and Canvas
    const originalWindow = global.window;
    const originalDocument = global.document;

    const mockCleanJpegBytes = new Uint8Array([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01, 0xFF, 0xDA, 0x00, 0xFF, 0xD9
    ]);
    const mockCleanBlob = new Blob([mockCleanJpegBytes], { type: 'image/jpeg' });

    // Mock HTMLCanvasElement and 2D context
    const mockCtx = {
      drawImage: () => {}
    };
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: (type: string) => (type === '2d' ? mockCtx : null),
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(mockCleanBlob);
      }
    };

    // Mock window & document
    global.window = {} as any;
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') return mockCanvas as any;
        return {};
      }
    } as any;

    // Mock global Image constructor and URL methods
    const originalImage = global.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = () => 'blob:mock-url';
    URL.revokeObjectURL = () => {};

    // Mock Image class to trigger onload asynchronously
    (global as any).Image = class {
      naturalWidth = 1920;
      naturalHeight = 1080;
      width = 1920;
      height = 1080;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 10);
      }
    };

    try {
      const sanitized = await stripImageMetadata(inputFile);

      // Verify sanitization succeeded
      expect(sanitized.stripped).toBe(true);
      expect(sanitized.file).toBeDefined();
      expect(sanitized.file.name).toBe('gps_camera_evidence.jpg');
      expect(sanitized.width).toBe(1920);
      expect(sanitized.height).toBe(1080);

      // Read output bytes and confirm APP1 EXIF marker is completely absent
      const outputBuffer = await sanitized.file.arrayBuffer();
      expect(hasJpegExifMarker(outputBuffer)).toBe(false);
    } finally {
      // Restore globals
      global.window = originalWindow;
      global.document = originalDocument;
      (global as any).Image = originalImage;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it('should fail closed (stripped === false) when Canvas getContext("2d") fails', async () => {
    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalImage = global.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = () => 'blob:mock-url';
    URL.revokeObjectURL = () => {};

    // Canvas returns null for 2D context (simulating GPU/canvas memory crash)
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => null
    };

    global.window = {} as any;
    global.document = {
      createElement: () => mockCanvas as any
    } as any;

    (global as any).Image = class {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 5);
      }
    };

    try {
      const testFile = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
      const result = await stripImageMetadata(testFile);

      // Must fail closed: stripped must be false
      expect(result.stripped).toBe(false);
    } finally {
      global.window = originalWindow;
      global.document = originalDocument;
      (global as any).Image = originalImage;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it('should fail closed (stripped === false) when canvas.toBlob returns null', async () => {
    const originalWindow = global.window;
    const originalDocument = global.document;
    const originalImage = global.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;

    URL.createObjectURL = () => 'blob:mock-url';
    URL.revokeObjectURL = () => {};

    // Canvas toBlob fails and passes null (simulating OOM during blob encoding)
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob: (cb: (b: Blob | null) => void) => {
        cb(null);
      }
    };

    global.window = {} as any;
    global.document = {
      createElement: () => mockCanvas as any
    } as any;

    (global as any).Image = class {
      naturalWidth = 800;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      set src(_val: string) {
        setTimeout(() => {
          if (this.onload) this.onload();
        }, 5);
      }
    };

    try {
      const testFile = new File([new Uint8Array([1, 2, 3])], 'photo.jpg', { type: 'image/jpeg' });
      const result = await stripImageMetadata(testFile);

      // Must fail closed: stripped must be false
      expect(result.stripped).toBe(false);
    } finally {
      global.window = originalWindow;
      global.document = originalDocument;
      (global as any).Image = originalImage;
      URL.createObjectURL = originalCreateObjectURL;
      URL.revokeObjectURL = originalRevokeObjectURL;
    }
  });

  it('reportService.uploadEvidenceImage must fail closed and reject upload if sanitized.stripped !== true', async () => {
    const { nafasReports } = await import('../src/lib/reports/reportService');
    const imageSanitizer = await import('../src/lib/media/imageSanitizer');

    // Simulate sanitization failure (e.g. stripped: false)
    const testFile = new File([new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9])], 'unclean.jpg', { type: 'image/jpeg' });
    vi.spyOn(nafasReports, 'isConfigured').mockReturnValue(true);
    vi.spyOn(imageSanitizer, 'stripImageMetadata').mockResolvedValue({
      file: testFile,
      stripped: false, // FAILED SANITIZATION
      originalSizeBytes: 4,
      sanitizedSizeBytes: 4,
      width: 0,
      height: 0,
      mimeType: 'image/jpeg'
    });

    // Verification: upload MUST throw clear privacy error and NEVER upload unsanitized original
    await expect(nafasReports.uploadEvidenceImage(testFile, 'baghdad')).rejects.toThrow(
      'فشلت معالجة وتجريد بيانات الموقع والكاميرا الحساسة (EXIF) من الصورة. تم إيقاف الرفع التزاماً بسياسة الخصوصية وحماية هوية المبلغين.'
    );
  });
});
