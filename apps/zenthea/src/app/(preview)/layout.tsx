/**
 * Preview Route Group Layout
 * 
 * Provides a minimal layout for the website builder preview iframe.
 * Routes in this group inherit from root layout but are isolated for preview purposes.
 */

export const metadata = {
  title: 'Website Preview',
  robots: 'noindex, nofollow', // Don't index preview pages
};

export default function PreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
