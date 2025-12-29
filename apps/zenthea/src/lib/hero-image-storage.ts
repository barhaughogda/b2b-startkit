/**
 * Hero Image Storage
 * 
 * Simple file-based storage for hero image URLs that works in Vercel
 */

import fs from 'fs';
import path from 'path';

const STORAGE_FILE = path.join(process.cwd(), 'public', 'hero-image.json');

export class HeroImageStorage {
  private static getDefaultUrl(): string {
    return 'https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg';
  }

  static getCurrentUrl(): string {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const content = fs.readFileSync(STORAGE_FILE, 'utf8');
        const data = JSON.parse(content);
        return data.url || this.getDefaultUrl();
      }
    } catch (error) {
      console.error('Error reading hero image storage:', error);
    }
    return this.getDefaultUrl();
  }

  static setCurrentUrl(url: string): boolean {
    try {
      // Ensure the public directory exists
      const publicDir = path.dirname(STORAGE_FILE);
      if (!fs.existsSync(publicDir)) {
        fs.mkdirSync(publicDir, { recursive: true });
      }

      const data = { url, updatedAt: new Date().toISOString() };
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
      console.log('Hero image URL stored:', url);
      return true;
    } catch (error) {
      console.error('Error storing hero image URL:', error);
      return false;
    }
  }

  static getStorageInfo() {
    try {
      if (fs.existsSync(STORAGE_FILE)) {
        const content = fs.readFileSync(STORAGE_FILE, 'utf8');
        const data = JSON.parse(content);
        return {
          exists: true,
          url: data.url,
          updatedAt: data.updatedAt
        };
      }
    } catch (error) {
      console.error('Error reading storage info:', error);
    }
    return {
      exists: false,
      url: this.getDefaultUrl(),
      updatedAt: null
    };
  }
}
