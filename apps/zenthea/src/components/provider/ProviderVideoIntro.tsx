'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Subtitles, FileText } from 'lucide-react';

interface ProviderVideoIntroProps {
  videoUrl?: string;
  thumbnailUrl?: string;
  transcript?: string;
  captionsUrl?: string;
  altText?: string;
}

export function ProviderVideoIntro({
  videoUrl,
  thumbnailUrl,
  transcript,
  captionsUrl,
  altText
}: ProviderVideoIntroProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  
  if (!videoUrl) {
    return null;
  }
  
  // Check if it's a YouTube or Vimeo URL
  const isYouTube = videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be');
  const isVimeo = videoUrl.includes('vimeo.com');
  
  // Extract video ID for embedding
  const getEmbedUrl = () => {
    if (isYouTube) {
      const youtubeId = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1];
      return youtubeId ? `https://www.youtube.com/embed/${youtubeId}` : null;
    }
    if (isVimeo) {
      const vimeoId = videoUrl.match(/vimeo\.com\/(\d+)/)?.[1];
      return vimeoId ? `https://player.vimeo.com/video/${vimeoId}` : null;
    }
    return videoUrl; // Direct video URL
  };
  
  const embedUrl = getEmbedUrl();
  
  if (!embedUrl) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Video Introduction</CardTitle>
        <CardDescription>Meet your provider</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="relative aspect-video bg-background-secondary rounded-lg overflow-hidden">
          {!isPlaying ? (
            <div className="relative w-full h-full">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt={altText || 'Video thumbnail'}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-background-elevated">
                  <Play className="h-16 w-16 text-text-secondary" />
                </div>
              )}
              <button
                onClick={() => setIsPlaying(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                aria-label="Play video"
              >
                <div className="bg-white/90 rounded-full p-4 hover:bg-white transition-colors">
                  <Play className="h-8 w-8 text-zenthea-teal fill-zenthea-teal" />
                </div>
              </button>
            </div>
          ) : (
            <iframe
              src={`${embedUrl}${isYouTube ? '?autoplay=1' : isVimeo ? '?autoplay=1' : ''}`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={altText || 'Provider introduction video'}
            />
          )}
        </div>
        
        {(transcript || captionsUrl) && (
          <div className="mt-4 flex gap-2">
            {captionsUrl && (
              <Button
                variant="outline"
                size="sm"
                asChild
              >
                <a href={captionsUrl} target="_blank" rel="noopener noreferrer">
                  <Subtitles className="h-4 w-4 mr-2" />
                  View Captions
                </a>
              </Button>
            )}
            {transcript && (
              <details className="flex-1">
                <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  View Transcript
                </summary>
                <div className="mt-2 p-3 bg-background-secondary rounded text-sm text-text-primary whitespace-pre-line">
                  {transcript}
                </div>
              </details>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

