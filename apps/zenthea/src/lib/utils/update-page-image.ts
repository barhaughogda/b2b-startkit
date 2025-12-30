/**
 * Utility to update page.tsx with new hero image URL
 */

import fs from 'fs';
import path from 'path';
import { logger } from '@/lib/logger';

export async function updatePageWithNewUrl(newUrl: string): Promise<string | null> {
  try {
    const pagePath = path.join(process.cwd(), 'src/app/page.tsx');
    
    if (!fs.existsSync(pagePath)) {
      logger.warn('page.tsx not found', JSON.stringify({ pagePath }));
      return null;
    }

    let content = fs.readFileSync(pagePath, 'utf8');
    
    // Extract the old URL before replacing
    const oldPattern = /backgroundImage: "url\('([^']*)'\)"/;
    const match = content.match(oldPattern);
    const oldUrl = match && match[1] ? match[1] : null;
    
    // Replace the background image URL
    const newUrlString = `backgroundImage: "url('${newUrl}')"`;
    
    if (content.match(oldPattern)) {
      content = content.replace(oldPattern, newUrlString);
      fs.writeFileSync(pagePath, content);
      logger.info('page.tsx updated with new hero image URL', JSON.stringify({ newUrl, oldUrl }));
      return oldUrl;
    } else {
      logger.warn('Could not find background image pattern in page.tsx');
      return null;
    }
  } catch (error) {
    logger.error('Failed to update page.tsx', JSON.stringify({ error }));
    throw error;
  }
}
