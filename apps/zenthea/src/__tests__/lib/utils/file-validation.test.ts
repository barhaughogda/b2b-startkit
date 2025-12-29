import {
  validateFileType,
  validateFileSize,
  sanitizeFilename,
  validateFile,
} from '@/lib/utils/file-validation';

describe('File Validation Utils', () => {
  describe('validateFileType', () => {
    it('should accept valid image types', () => {
      expect(validateFileType('image/jpeg')).toBe(true);
      expect(validateFileType('image/png')).toBe(true);
      expect(validateFileType('image/webp')).toBe(true);
    });

    it('should reject invalid file types', () => {
      expect(validateFileType('application/pdf')).toBe(false);
      expect(validateFileType('text/plain')).toBe(false);
    });

    it('should handle case insensitive types', () => {
      expect(validateFileType('IMAGE/JPEG')).toBe(true);
    });
  });

  describe('validateFileSize', () => {
    it('should accept files within size limit', () => {
      expect(validateFileSize(1024 * 1024, 2 * 1024 * 1024)).toBe(true); // 1MB within 2MB limit
    });

    it('should reject files exceeding size limit', () => {
      expect(validateFileSize(3 * 1024 * 1024, 2 * 1024 * 1024)).toBe(false); // 3MB over 2MB limit
    });

    it('should handle zero size files', () => {
      expect(validateFileSize(0, 1 * 1024 * 1024)).toBe(true);
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove special characters', () => {
      expect(sanitizeFilename('file!@#$name.jpg')).toBe('file_name.jpg');
    });

    it('should handle unicode characters', () => {
      expect(sanitizeFilename('résumé.pdf')).toBe('r_sum_.pdf'); // Unicode characters are converted
    });

    it('should preserve valid characters', () => {
      expect(sanitizeFilename('my-file_name.1.0.png')).toBe('my-file_name.1.0.png');
    });

    it('should handle empty filenames', () => {
      expect(sanitizeFilename('')).toBe('');
    });
  });

  describe('validateFile', () => {
    const mockFile = (type: string, size: number, name: string): File =>
      new File([new ArrayBuffer(size)], name, { type });

    it('should validate logo files correctly', () => {
      const file = mockFile('image/png', 1 * 1024 * 1024, 'logo.png'); // 1MB
      const result = validateFile(file, 'logo');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate hero files correctly', () => {
      const file = mockFile('image/jpeg', 8 * 1024 * 1024, 'hero.jpeg'); // 8MB
      const result = validateFile(file, 'hero');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid file types', () => {
      const file = mockFile('application/pdf', 100, 'document.pdf');
      const result = validateFile(file, 'logo');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file type. Only image/jpeg, image/jpg, image/png, image/webp are allowed.');
    });

    it('should reject oversized files', () => {
      const file = mockFile('image/png', 6 * 1024 * 1024, 'large-logo.png'); // 6MB for logo
      const result = validateFile(file, 'logo');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('File too large. Maximum size is 5MB.');

      const heroFile = mockFile('image/jpeg', 12 * 1024 * 1024, 'large-hero.jpeg'); // 12MB for hero
      const heroResult = validateFile(heroFile, 'hero');
      expect(heroResult.valid).toBe(false);
      expect(heroResult.error).toBe('File too large. Maximum size is 10MB.');
    });
  });
});