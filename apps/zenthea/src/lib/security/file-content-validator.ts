/**
 * File content validation utilities
 * Validates file content beyond MIME type checking to prevent malicious files
 */

interface FileSignature {
  signature: number[];
  offset: number;
  extension: string;
  mimeType: string;
}

// Common file signatures (magic numbers)
const FILE_SIGNATURES: FileSignature[] = [
  // Images
  { signature: [0xFF, 0xD8, 0xFF], offset: 0, extension: 'jpg', mimeType: 'image/jpeg' },
  { signature: [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A], offset: 0, extension: 'png', mimeType: 'image/png' },
  { signature: [0x47, 0x49, 0x46, 0x38], offset: 0, extension: 'gif', mimeType: 'image/gif' },
  { signature: [0x52, 0x49, 0x46, 0x46], offset: 0, extension: 'webp', mimeType: 'image/webp' }, // RIFF header
  { signature: [0x42, 0x4D], offset: 0, extension: 'bmp', mimeType: 'image/bmp' },
  { signature: [0x00, 0x00, 0x01, 0x00], offset: 0, extension: 'ico', mimeType: 'image/x-icon' },
  
  // Documents (for reference, but we only allow images)
  { signature: [0x25, 0x50, 0x44, 0x46], offset: 0, extension: 'pdf', mimeType: 'application/pdf' },
  { signature: [0x50, 0x4B, 0x03, 0x04], offset: 0, extension: 'zip', mimeType: 'application/zip' },
  { signature: [0x50, 0x4B, 0x05, 0x06], offset: 0, extension: 'zip', mimeType: 'application/zip' },
  { signature: [0x50, 0x4B, 0x07, 0x08], offset: 0, extension: 'zip', mimeType: 'application/zip' },
];

class FileContentValidator {
  /**
   * Validate file content by checking magic numbers
   */
  async validateFileContent(
    file: File,
    expectedMimeType: string
  ): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
    try {
      // Read first 32 bytes to check magic numbers
      const buffer = await this.readFileHeader(file, 32);
      
      // Check against known signatures
      const detectedSignature = this.detectFileSignature(buffer);
      
      if (!detectedSignature) {
        return {
          valid: false,
          error: 'Unknown file type - no valid signature detected'
        };
      }

      // Verify detected type matches expected MIME type
      if (detectedSignature.mimeType !== expectedMimeType) {
        return {
          valid: false,
          detectedType: detectedSignature.mimeType,
          error: `File content doesn't match MIME type. Expected: ${expectedMimeType}, Detected: ${detectedSignature.mimeType}`
        };
      }

      // Additional validation for images
      if (expectedMimeType.startsWith('image/')) {
        const imageValidation = await this.validateImageContent(file, detectedSignature);
        if (!imageValidation.valid) {
          return imageValidation;
        }
      }

      return { valid: true, detectedType: detectedSignature.mimeType };
    } catch (error) {
      console.error('File content validation error:', error);
      return {
        valid: false,
        error: 'File content validation failed'
      };
    }
  }

  /**
   * Read file header bytes
   * Uses arrayBuffer() which works in both browser and Node.js environments
   */
  private async readFileHeader(file: File, bytes: number): Promise<Uint8Array> {
    try {
      // Slice to only read the bytes we need
      const slice = file.slice(0, bytes);
      const buffer = await slice.arrayBuffer();
      return new Uint8Array(buffer, 0, Math.min(bytes, buffer.byteLength));
    } catch (error) {
      throw new Error(`Failed to read file header: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Detect file signature from buffer
   */
  private detectFileSignature(buffer: Uint8Array): FileSignature | null {
    for (const signature of FILE_SIGNATURES) {
      if (this.matchesSignature(buffer, signature)) {
        return signature;
      }
    }
    return null;
  }

  /**
   * Check if buffer matches file signature
   */
  private matchesSignature(buffer: Uint8Array, signature: FileSignature): boolean {
    if (buffer.length < signature.signature.length + signature.offset) {
      return false;
    }

    for (let i = 0; i < signature.signature.length; i++) {
      if (buffer[signature.offset + i] !== signature.signature[i]) {
        return false;
      }
    }

    return true;
  }

  /**
   * Additional validation for image files
   */
  private async validateImageContent(
    file: File, 
    signature: FileSignature
  ): Promise<{ valid: boolean; error?: string }> {
    try {
      // Check file size limits
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        return {
          valid: false,
          error: `File too large. Maximum size: ${maxSize / (1024 * 1024)}MB`
        };
      }

      // Additional validation based on file type
      switch (signature.extension) {
        case 'jpg':
        case 'jpeg':
          return this.validateJPEG(file);
        case 'png':
          return this.validatePNG(file);
        case 'gif':
          return this.validateGIF(file);
        case 'webp':
          return this.validateWebP(file);
        default:
          return { valid: true };
      }
    } catch (error) {
      return {
        valid: false,
        error: 'Image validation failed'
      };
    }
  }

  /**
   * Validate JPEG file structure
   */
  private async validateJPEG(file: File): Promise<{ valid: boolean; error?: string }> {
    // Check for JFIF or EXIF markers
    const buffer = await this.readFileHeader(file, 64);
    
    // Look for JFIF marker (0xFF, 0xE0) or EXIF marker (0xFF, 0xE1)
    const hasValidMarker = this.findJPEGMarker(buffer, [0xFF, 0xE0]) || 
                          this.findJPEGMarker(buffer, [0xFF, 0xE1]);
    
    if (!hasValidMarker) {
      return {
        valid: false,
        error: 'Invalid JPEG structure - missing JFIF or EXIF markers'
      };
    }

    return { valid: true };
  }

  /**
   * Validate PNG file structure
   */
  private async validatePNG(file: File): Promise<{ valid: boolean; error?: string }> {
    // PNG signature is already checked in detectFileSignature
    // Additional validation could check for required chunks (IHDR, IEND)
    return { valid: true };
  }

  /**
   * Validate GIF file structure
   */
  private async validateGIF(file: File): Promise<{ valid: boolean; error?: string }> {
    // GIF signature is already checked
    // Additional validation could check for valid GIF structure
    return { valid: true };
  }

  /**
   * Validate WebP file structure
   */
  private async validateWebP(file: File): Promise<{ valid: boolean; error?: string }> {
    // WebP validation is complex - for now, just check signature
    return { valid: true };
  }

  /**
   * Find JPEG marker in buffer
   */
  private findJPEGMarker(buffer: Uint8Array, marker: number[]): boolean {
    for (let i = 0; i <= buffer.length - marker.length; i++) {
      let found = true;
      for (let j = 0; j < marker.length; j++) {
        if (buffer[i + j] !== marker[j]) {
          found = false;
          break;
        }
      }
      if (found) return true;
    }
    return false;
  }

  /**
   * Check for suspicious file patterns
   */
  async checkForSuspiciousContent(file: File): Promise<{ suspicious: boolean; warnings: string[] }> {
    const warnings: string[] = [];
    
    try {
      // Read more of the file to check for suspicious patterns
      const buffer = await this.readFileHeader(file, 1024);
      
      // Check for executable signatures
      const executableSignatures = [
        [0x4D, 0x5A], // PE executable
        [0x7F, 0x45, 0x4C, 0x46], // ELF executable
        [0xFE, 0xED, 0xFA, 0xCE], // Mach-O executable
      ];

      for (const signature of executableSignatures) {
        if (this.matchesSignature(buffer, { signature, offset: 0, extension: '', mimeType: '' })) {
          warnings.push('File contains executable signatures');
          break;
        }
      }

      // Check for script signatures
      const scriptPatterns = [
        /<script/i,
        /javascript:/i,
        /vbscript:/i,
        /onload=/i,
        /onerror=/i,
      ];

      const textContent = new TextDecoder().decode(buffer);
      for (const pattern of scriptPatterns) {
        if (pattern.test(textContent)) {
          warnings.push('File contains script-like content');
          break;
        }
      }

      return {
        suspicious: warnings.length > 0,
        warnings
      };
    } catch (error) {
      return {
        suspicious: false,
        warnings: []
      };
    }
  }
}

// Singleton instance
const fileContentValidator = new FileContentValidator();

/**
 * Validate file content beyond MIME type
 */
export async function validateFileContent(
  file: File,
  expectedMimeType: string
): Promise<{ valid: boolean; detectedType?: string; error?: string }> {
  return fileContentValidator.validateFileContent(file, expectedMimeType);
}

/**
 * Check for suspicious file content
 */
export async function checkSuspiciousContent(
  file: File
): Promise<{ suspicious: boolean; warnings: string[] }> {
  return fileContentValidator.checkForSuspiciousContent(file);
}

export default fileContentValidator;
