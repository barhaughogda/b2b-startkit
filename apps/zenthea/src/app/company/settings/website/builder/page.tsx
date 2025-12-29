import { redirect } from 'next/navigation';

/**
 * Legacy redirect: /company/settings/website/builder → /company/settings/website
 * 
 * The website builder has been moved to /company/settings/website.
 * This redirect preserves bookmarks and old internal links.
 */
export default function WebsiteBuilderRedirect() {
  redirect('/company/settings/website');
}
