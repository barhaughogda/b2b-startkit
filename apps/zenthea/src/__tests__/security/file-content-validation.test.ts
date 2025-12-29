/**
 * Security tests for file content validation functionality
 */

import { validateFileContent, checkSuspiciousContent } from '@/lib/security/file-content-validator';

// Mock File constructor
const createMockFile = (content: string, name: string, type: string): File => {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
};

// Mock File with binary content
const createMockBinaryFile = (bytes: number[], name: string, type: string): File => {
  const buffer = new Uint8Array(bytes);
  const blob = new Blob([buffer], { type });
  return new File([blob], name, { type });
};

describe('File Content Validation Security Tests', () => {
  describe('File Signature Validation', () => {
    it('should validate JPEG files correctly', async () => {
      // JPEG signature: FF D8 FF
      const jpegFile = createMockBinaryFile([0xFF, 0xD8, 0xFF, 0xE0], 'test.jpg', 'image/jpeg');
      
      const result = await validateFileContent(jpegFile, 'image/jpeg');
      
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/jpeg');
    });

    it('should validate PNG files correctly', async () => {
      // PNG signature: 89 50 4E 47 0D 0A 1A 0A
      const pngFile = createMockBinaryFile([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ], 'test.png', 'image/png');
      
      const result = await validateFileContent(pngFile, 'image/png');
      
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/png');
    });

    it('should validate WebP files correctly', async () => {
      // WebP signature: RIFF header
      const webpFile = createMockBinaryFile([
        0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
        0x57, 0x45, 0x42, 0x50
      ], 'test.webp', 'image/webp');
      
      const result = await validateFileContent(webpFile, 'image/webp');
      
      expect(result.valid).toBe(true);
      expect(result.detectedType).toBe('image/webp');
    });

    it('should reject files with mismatched content and MIME type', async () => {
      // PNG signature but JPEG MIME type
      const fakeJpegFile = createMockBinaryFile([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
      ], 'fake.jpg', 'image/jpeg');
      
      const result = await validateFileContent(fakeJpegFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain("File content doesn't match MIME type");
    });

    it('should reject files with unknown signatures', async () => {
      const unknownFile = createMockBinaryFile([0x00, 0x01, 0x02, 0x03], 'unknown.bin', 'image/jpeg');
      
      const result = await validateFileContent(unknownFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown file type');
    });
  });

  describe('File Size Validation', () => {
    it('should reject files that are too large', async () => {
      // Create a large file (simulate 11MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const largeFile = createMockFile(largeContent, 'large.jpg', 'image/jpeg');
      
      // Mock the file size
      Object.defineProperty(largeFile, 'size', {
        value: 11 * 1024 * 1024,
        writable: false
      });
      
      const result = await validateFileContent(largeFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should accept files within size limits', async () => {
      const normalFile = createMockBinaryFile([0xFF, 0xD8, 0xFF], 'normal.jpg', 'image/jpeg');
      
      // Mock normal file size
      Object.defineProperty(normalFile, 'size', {
        value: 1024 * 1024, // 1MB
        writable: false
      });
      
      const result = await validateFileContent(normalFile, 'image/jpeg');
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Suspicious Content Detection', () => {
    it('should detect executable signatures', async () => {
      // PE executable signature: 4D 5A
      const executableFile = createMockBinaryFile([0x4D, 0x5A], 'malware.exe', 'image/jpeg');
      
      const result = await checkSuspiciousContent(executableFile);
      
      expect(result.suspicious).toBe(true);
      expect(result.warnings).toContain('File contains executable signatures');
    });

    it('should detect script content', async () => {
      const scriptFile = createMockFile(
        '<script>alert("xss")</script>',
        'malicious.jpg',
        'image/jpeg'
      );
      
      const result = await checkSuspiciousContent(scriptFile);
      
      expect(result.suspicious).toBe(true);
      expect(result.warnings).toContain('File contains script-like content');
    });

    it('should detect JavaScript URLs', async () => {
      const jsFile = createMockFile(
        'javascript:alert("xss")',
        'malicious.jpg',
        'image/jpeg'
      );
      
      const result = await checkSuspiciousContent(jsFile);
      
      expect(result.suspicious).toBe(true);
      expect(result.warnings).toContain('File contains script-like content');
    });

    it('should detect VBScript URLs', async () => {
      const vbFile = createMockFile(
        'vbscript:msgbox("xss")',
        'malicious.jpg',
        'image/jpeg'
      );
      
      const result = await checkSuspiciousContent(vbFile);
      
      expect(result.suspicious).toBe(true);
      expect(result.warnings).toContain('File contains script-like content');
    });

    it('should detect event handlers', async () => {
      const eventFile = createMockFile(
        'onload=alert("xss")',
        'malicious.jpg',
        'image/jpeg'
      );
      
      const result = await checkSuspiciousContent(eventFile);
      
      expect(result.suspicious).toBe(true);
      expect(result.warnings).toContain('File contains script-like content');
    });

    it('should not flag legitimate image content', async () => {
      const legitimateFile = createMockBinaryFile([0xFF, 0xD8, 0xFF], 'legitimate.jpg', 'image/jpeg');
      
      const result = await checkSuspiciousContent(legitimateFile);
      
      expect(result.suspicious).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('JPEG Structure Validation', () => {
    it('should validate JPEG with JFIF marker', async () => {
      // JPEG with JFIF marker (FF E0)
      const jpegFile = createMockBinaryFile([
        0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46
      ], 'test.jpg', 'image/jpeg');
      
      const result = await validateFileContent(jpegFile, 'image/jpeg');
      
      expect(result.valid).toBe(true);
    });

    it('should validate JPEG with EXIF marker', async () => {
      // JPEG with EXIF marker (FF E1)
      const jpegFile = createMockBinaryFile([
        0xFF, 0xD8, 0xFF, 0xE1, 0x00, 0x10, 0x45, 0x78, 0x69, 0x66
      ], 'test.jpg', 'image/jpeg');
      
      const result = await validateFileContent(jpegFile, 'image/jpeg');
      
      expect(result.valid).toBe(true);
    });

    it('should reject JPEG without valid markers', async () => {
      // JPEG without JFIF or EXIF markers
      const invalidJpegFile = createMockBinaryFile([
        0xFF, 0xD8, 0xFF, 0xE2 // Invalid marker
      ], 'invalid.jpg', 'image/jpeg');
      
      const result = await validateFileContent(invalidJpegFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid JPEG structure');
    });
  });

  describe('Error Handling', () => {
    it('should handle file reading errors gracefully', async () => {
      // Create a file that might cause reading errors
      const problematicFile = {
        name: 'problematic.jpg',
        type: 'image/jpeg',
        size: 1024,
        arrayBuffer: () => Promise.reject(new Error('Read error'))
      } as File;
      
      const result = await validateFileContent(problematicFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File content validation failed');
    });

    it('should handle suspicious content check errors gracefully', async () => {
      const problematicFile = {
        name: 'problematic.jpg',
        type: 'image/jpeg',
        size: 1024,
        arrayBuffer: () => Promise.reject(new Error('Read error'))
      } as File;
      
      const result = await checkSuspiciousContent(problematicFile);
      
      expect(result.suspicious).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('File Type Edge Cases', () => {
    it('should handle empty files', async () => {
      const emptyFile = createMockBinaryFile([], 'empty.jpg', 'image/jpeg');
      
      const result = await validateFileContent(emptyFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown file type');
    });

    it('should handle files with only partial signatures', async () => {
      const partialFile = createMockBinaryFile([0xFF, 0xD8], 'partial.jpg', 'image/jpeg');
      
      const result = await validateFileContent(partialFile, 'image/jpeg');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unknown file type');
    });
  });
});
