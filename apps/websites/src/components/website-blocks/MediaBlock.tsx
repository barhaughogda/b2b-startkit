'use client';

/**
 * Media Block
 * 
 * Displays images (single or gallery) or videos (YouTube, Vimeo, direct URLs).
 * Supports configurable aspect ratios and gallery/slider mode for multiple images.
 */

import React, { useState } from 'react';
import { MediaBlockProps } from '@/lib/website-builder/schema';
import { BlockComponentProps } from './block-registry';
import { BlockSection, useAppearanceStyles } from './BlockSection';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Play,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  Film,
} from 'lucide-react';
import {
  getSecondaryTextColor,
  getTertiaryTextColor,
} from '@/lib/website-builder/theme-utils';

export interface MediaBlockComponentProps
  extends BlockComponentProps<MediaBlockProps> {}

/**
 * Extract embed URL from YouTube or Vimeo links
 * Validates URLs to ensure they're from trusted domains
 */
function getVideoEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/
  );
  if (youtubeMatch && youtubeMatch[1]) {
    const videoId = youtubeMatch[1];
    // Validate video ID format (alphanumeric, hyphens, underscores only)
    if (!/^[a-zA-Z0-9_-]+$/.test(videoId)) {
      return null;
    }
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    const videoId = vimeoMatch[1];
    // Validate video ID is numeric
    if (!/^\d+$/.test(videoId)) {
      return null;
    }
    return `https://player.vimeo.com/video/${videoId}`;
  }

  // Direct video URL (MP4, WebM, etc.)
  if (url.match(/\.(mp4|webm|ogg)(\?|$)/i)) {
    // Validate URL uses HTTPS
    try {
      const urlObj = new URL(url);
      if (urlObj.protocol !== 'https:') {
        return null;
      }
      return url;
    } catch {
      return null;
    }
  }

  // Validate embed URL is from trusted domain
  const trustedEmbedDomains = [
    'www.youtube.com',
    'www.youtube-nocookie.com',
    'youtube.com',
    'youtube-nocookie.com',
    'player.vimeo.com',
  ];
  
  try {
    const urlObj = new URL(url);
    const isAllowedDomain = trustedEmbedDomains.some(domain => 
      urlObj.hostname === domain || urlObj.hostname.endsWith(`.${domain}`)
    );
    
    if (isAllowedDomain && (urlObj.pathname.includes('/embed') || urlObj.pathname.includes('/video'))) {
      return url;
    }
  } catch {
    // Invalid URL format
    return null;
  }

  // Reject unknown URLs
  return null;
}

/**
 * Check if URL is a direct video file (not an embed)
 */
function isDirectVideoUrl(url: string): boolean {
  return Boolean(url.match(/\.(mp4|webm|ogg)(\?|$)/i));
}

export default function MediaBlock({
  props,
  isPreview,
  theme,
  appearance,
  blockId,
}: MediaBlockComponentProps) {
  const {
    mediaKind = 'image',
    aspect = 'landscape-16-9',
    imageMode = 'single',
    imageUrl,
    imageAlt,
    galleryImages = [],
    videoUrl,
  } = props;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);

  const secondaryTextColor = getSecondaryTextColor(theme);
  const tertiaryTextColor = getTertiaryTextColor(theme);

  // Get appearance styles
  const { textColor: appearanceTextColor } = useAppearanceStyles(appearance, theme);
  const placeholderColor = appearanceTextColor || tertiaryTextColor;

  // Aspect ratio classes
  const aspectClasses: Record<string, string> = {
    square: 'aspect-square',
    'landscape-16-9': 'aspect-video', // 16:9
  };

  // Gallery images for display
  const displayGalleryImages =
    imageMode === 'gallery' && galleryImages.length > 0
      ? galleryImages
      : imageMode === 'single' && imageUrl
        ? [{ id: 'single', url: imageUrl, alt: imageAlt }]
        : [];

  const canGoNext = currentSlide < displayGalleryImages.length - 1;
  const canGoPrev = currentSlide > 0;

  const handleNext = () => {
    if (canGoNext) setCurrentSlide((prev) => prev + 1);
  };

  const handlePrev = () => {
    if (canGoPrev) setCurrentSlide((prev) => prev - 1);
  };

  // Handle video play button click
  const handlePlayVideo = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVideoPlaying(true);
  };

  // Render video player
  const renderVideo = () => {
    const embedUrl = getVideoEmbedUrl(videoUrl || '');

    if (!embedUrl) {
      // Placeholder
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
          <div className="text-center">
            <Film
              className="w-16 h-16 mx-auto mb-2"
              style={{ color: placeholderColor }}
            />
            <p className="text-sm" style={{ color: secondaryTextColor }}>
              Add a video URL
            </p>
          </div>
        </div>
      );
    }

    // Direct video file
    if (isDirectVideoUrl(embedUrl)) {
      return (
        <video
          src={embedUrl}
          controls
          className="absolute inset-0 w-full h-full object-cover"
          poster={imageUrl} // Use imageUrl as poster if available
          preload="metadata"
        >
          Your browser does not support the video tag.
        </video>
      );
    }

    // Embed (YouTube/Vimeo)
    if (!isVideoPlaying) {
      return (
        <button
          type="button"
          onClick={handlePlayVideo}
          onMouseDown={(e) => e.preventDefault()} // Prevent focus issues
          className="absolute inset-0 flex items-center justify-center bg-surface-secondary hover:bg-surface-secondary/80 transition-colors group cursor-pointer z-10"
          aria-label="Play video"
          style={{ pointerEvents: 'auto' }}
        >
          {/* Thumbnail if available */}
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover"
              draggable={false}
            />
          )}
          <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
          <div className="relative bg-white/90 rounded-full p-4 group-hover:bg-white transition-colors pointer-events-none">
            <Play className="w-8 h-8 text-zenthea-teal fill-zenthea-teal" />
          </div>
        </button>
      );
    }

    // Build embed URL with proper autoplay parameter
    const isYouTube = embedUrl.includes('youtube.com/embed');
    const isVimeo = embedUrl.includes('player.vimeo.com');
    
    let finalEmbedUrl = embedUrl;
    if (isYouTube) {
      // YouTube uses ?autoplay=1
      finalEmbedUrl = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1&rel=0`;
    } else if (isVimeo) {
      // Vimeo uses ?autoplay=1
      finalEmbedUrl = `${embedUrl}${embedUrl.includes('?') ? '&' : '?'}autoplay=1`;
    }

    return (
      <iframe
        src={finalEmbedUrl}
        className="absolute inset-0 w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        allowFullScreen
        title="Video player"
        loading="lazy"
        style={{ pointerEvents: 'auto' }}
      />
    );
  };

  // Render image gallery/single image
  const renderImage = () => {
    if (displayGalleryImages.length === 0) {
      // Placeholder
      return (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-secondary">
          <div className="text-center">
            <ImageIcon
              className="w-16 h-16 mx-auto mb-2"
              style={{ color: placeholderColor }}
            />
            <p className="text-sm" style={{ color: secondaryTextColor }}>
              {imageMode === 'gallery'
                ? 'Add images to gallery'
                : 'Upload an image'}
            </p>
          </div>
        </div>
      );
    }

    // Single image or gallery view
    const currentImage = displayGalleryImages[currentSlide];
    if (!currentImage) return null;

    return (
      <>
        <img
          src={currentImage.url}
          alt={currentImage.alt || 'Media image'}
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Gallery navigation */}
        {displayGalleryImages.length > 1 && (
          <>
            {/* Navigation buttons */}
            <div className="absolute inset-y-0 left-0 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrev}
                disabled={!canGoPrev}
                className="ml-2 bg-white/80 hover:bg-white disabled:opacity-50 rounded-full"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleNext}
                disabled={!canGoNext}
                className="mr-2 bg-white/80 hover:bg-white disabled:opacity-50 rounded-full"
                aria-label="Next image"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            {/* Dots indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {displayGalleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    idx === currentSlide
                      ? 'bg-white'
                      : 'bg-white/50 hover:bg-white/75'
                  )}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          </>
        )}
      </>
    );
  };

  return (
    <BlockSection
      appearance={appearance}
      theme={theme}
      blockType="media"
      as="section"
      blockId={blockId}
    >
      <div
        className={cn(
          'relative w-full overflow-hidden rounded-lg',
          aspectClasses[aspect]
        )}
      >
        {mediaKind === 'video' ? renderVideo() : renderImage()}
      </div>
    </BlockSection>
  );
}

