import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export async function updatePageWithLogoUrl(newUrl: string): Promise<string | null> {
  try {
    const pagePath = path.join(process.cwd(), 'src/app/page.tsx');
    
    if (!fs.existsSync(pagePath)) {
      logger.warn('page.tsx not found', JSON.stringify({ pagePath }));
      return null;
    }

    let content = fs.readFileSync(pagePath, 'utf8');
    let oldUrl: string | null = null;
    
    // Look for existing logo URL patterns
    const logoPatterns = [
      /src=["']([^"']*\/api\/serve-image\?key=images%2Flogo%2F[^"']*)["']/,
      /src=["']([^"']*\/api\/serve-image\?key=images\/logo\/[^"']*)["']/,
      /src=["']([^"']*logo[^"']*)["']/
    ];
    
    // Find and extract old URL
    for (const pattern of logoPatterns) {
      const match = content.match(pattern);
      if (match) {
        oldUrl = match[1];
        break;
      }
    }
    
    // Replace logo src attribute
    const logoRegex = /src=["'][^"']*logo[^"']*["']/;
    const newSrcString = `src="${newUrl}"`;
    
    if (content.match(logoRegex)) {
      content = content.replace(logoRegex, newSrcString);
      fs.writeFileSync(pagePath, content);
      logger.info('page.tsx updated with new logo URL', JSON.stringify({ newUrl, oldUrl }));
    } else {
      // If no existing logo found, look for the Zenthea logo and replace it
      const zentheaLogoPattern = /<img[^>]*alt=["']Zenthea EHR["'][^>]*>/;
      if (content.match(zentheaLogoPattern)) {
        content = content.replace(
          zentheaLogoPattern,
          `<img src="${newUrl}" alt="Zenthea EHR" className="h-8 w-auto" />`
        );
        fs.writeFileSync(pagePath, content);
        logger.info('page.tsx updated with new logo URL (replaced Zenthea logo)', JSON.stringify({ newUrl }));
      } else {
        logger.warn('Could not find logo pattern in page.tsx');
      }
    }
    
    return oldUrl;
  } catch (error) {
    logger.error('Failed to update page.tsx with logo', JSON.stringify({ error }));
    throw error;
  }
}
