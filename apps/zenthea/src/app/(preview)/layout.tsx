/**
 * Preview Route Group Layout
 * 
 * Provides a minimal layout for the website builder preview iframe.
 * Routes in this group inherit from root layout but are isolated for preview purposes.
 */

import React from "react";

export const metadata = {
  title: 'Website Preview',
  robots: 'noindex, nofollow', // Don't index preview pages
};

export default function PreviewLayout({
  children,
}: any) {
  return children;
}
