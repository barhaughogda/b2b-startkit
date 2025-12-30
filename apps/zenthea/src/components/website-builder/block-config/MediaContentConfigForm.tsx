'use client';

/**
 * Media Content Config Form
 * 
 * Configuration panel for editing Media block content in the Website Builder sidebar.
 * Allows configuring single images, image galleries, or video embeds.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '../ImageUpload';
import { Plus, Trash2, GripVertical } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

interface GalleryImage {
  id: string;
  url: string;
  alt?: string;
}

interface MediaContentConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function MediaContentConfigForm({
  props,
  onUpdate,
  disabled,
}: MediaContentConfigFormProps) {
  const mediaKind = (props.mediaKind as string) || 'image';
  const aspect = (props.aspect as string) || 'landscape-16-9';
  const imageMode = (props.imageMode as string) || 'single';
  const imageUrl = (props.imageUrl as string) || '';
  const imageAlt = (props.imageAlt as string) || '';
  const galleryImages = (props.galleryImages as GalleryImage[]) || [];
  const videoUrl = (props.videoUrl as string) || '';

  // Gallery management functions
  const handleAddGalleryImage = () => {
    const newImage: GalleryImage = {
      id: Date.now().toString(),
      url: '',
      alt: '',
    };
    onUpdate({ ...props, galleryImages: [...galleryImages, newImage] });
  };

  const handleUpdateGalleryImage = (
    index: number,
    updates: Partial<GalleryImage>
  ) => {
    const newImages = [...galleryImages];
    const existing = newImages[index];
    if (existing) {
      newImages[index] = { ...existing, ...updates } as GalleryImage;
      onUpdate({ ...props, galleryImages: newImages });
    }
  };

  const handleRemoveGalleryImage = (index: number) => {
    const newImages = galleryImages.filter((_, i) => i !== index);
    onUpdate({ ...props, galleryImages: newImages });
  };

  return (
    <div className="space-y-6">
      {/* Media Type */}
      <div className="space-y-2">
        <Label htmlFor="media-kind">Media Type</Label>
        <Select
          value={mediaKind}
          onValueChange={(value) =>
            onUpdate({ ...props, mediaKind: value })
          }
          disabled={disabled}
        >
          <SelectTrigger id="media-kind">
            <SelectValue placeholder="Select media type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Aspect Ratio */}
      <div className="space-y-2">
        <Label htmlFor="media-aspect">Aspect Ratio</Label>
        <Select
          value={aspect}
          onValueChange={(value) => onUpdate({ ...props, aspect: value })}
          disabled={disabled}
        >
          <SelectTrigger id="media-aspect">
            <SelectValue placeholder="Select aspect ratio" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="square">Square (1:1)</SelectItem>
            <SelectItem value="landscape-16-9">Landscape (16:9)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Image Configuration */}
      {mediaKind === 'image' && (
        <div className="space-y-4 border-t border-border-primary pt-6">
          <h4 className="font-medium text-sm text-text-primary">Image Settings</h4>

          {/* Image Mode */}
          <div className="space-y-2">
            <Label htmlFor="image-mode">Display Mode</Label>
            <Select
              value={imageMode}
              onValueChange={(value) =>
                onUpdate({ ...props, imageMode: value })
              }
              disabled={disabled}
            >
              <SelectTrigger id="image-mode">
                <SelectValue placeholder="Select display mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="single">Single Image</SelectItem>
                <SelectItem value="gallery">Gallery / Slider</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Single Image */}
          {imageMode === 'single' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Image</Label>
                <ImageUpload
                  value={imageUrl}
                  onChange={(url) => onUpdate({ ...props, imageUrl: url })}
                  disabled={disabled}
                  aspectRatio={aspect === 'square' ? 'square' : 'landscape'}
                  imageType="block"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="single-image-alt">Alt Text</Label>
                <Input
                  id="single-image-alt"
                  value={imageAlt}
                  onChange={(e) =>
                    onUpdate({ ...props, imageAlt: e.target.value || undefined })
                  }
                  disabled={disabled}
                  placeholder="Describe the image for accessibility"
                />
              </div>
            </div>
          )}

          {/* Gallery Mode */}
          {imageMode === 'gallery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Gallery Images</Label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddGalleryImage}
                  disabled={disabled}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add
                </Button>
              </div>

              {galleryImages.length === 0 && (
                <p className="text-sm text-text-tertiary text-center py-4">
                  No images in gallery. Click &quot;Add&quot; to add your first image.
                </p>
              )}

              {galleryImages.map((image, index) => (
                <div
                  key={image.id}
                  className="p-4 bg-surface-secondary rounded-lg space-y-3 border border-border-primary"
                >
                  {/* Item Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-text-tertiary" />
                      <span className="text-sm font-medium text-text-primary">
                        Image {index + 1}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleRemoveGalleryImage(index)}
                      disabled={disabled}
                      className="h-8 w-8 text-status-error hover:text-status-error hover:bg-status-error/10"
                      aria-label={`Delete image ${index + 1}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Image Upload */}
                  <ImageUpload
                    value={image.url}
                    onChange={(url) =>
                      handleUpdateGalleryImage(index, { url })
                    }
                    disabled={disabled}
                    aspectRatio={aspect === 'square' ? 'square' : 'landscape'}
                    imageType="block"
                  />

                  {/* Alt Text */}
                  <div className="space-y-1">
                    <Label
                      htmlFor={`gallery-alt-${index}`}
                      className="text-xs text-text-secondary"
                    >
                      Alt Text
                    </Label>
                    <Input
                      id={`gallery-alt-${index}`}
                      value={image.alt || ''}
                      onChange={(e) =>
                        handleUpdateGalleryImage(index, {
                          alt: e.target.value || undefined,
                        })
                      }
                      disabled={disabled}
                      placeholder="Describe this image"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Video Configuration */}
      {mediaKind === 'video' && (
        <div className="space-y-4 border-t border-border-primary pt-6">
          <h4 className="font-medium text-sm text-text-primary">Video Settings</h4>

          <div className="space-y-2">
            <Label htmlFor="video-url">Video URL</Label>
            <Input
              id="video-url"
              value={videoUrl}
              onChange={(e) =>
                onUpdate({ ...props, videoUrl: e.target.value || undefined })
              }
              disabled={disabled}
              placeholder="https://youtube.com/watch?v=... or vimeo.com/..."
            />
            <p className="text-xs text-text-tertiary">
              Supports YouTube, Vimeo, or direct video URLs (MP4, WebM)
            </p>
          </div>

          {/* Optional thumbnail for video */}
          <div className="space-y-2">
            <Label>Thumbnail (Optional)</Label>
            <ImageUpload
              value={imageUrl}
              onChange={(url) => onUpdate({ ...props, imageUrl: url })}
              disabled={disabled}
              aspectRatio={aspect === 'square' ? 'square' : 'landscape'}
              imageType="block"
            />
            <p className="text-xs text-text-tertiary">
              Custom thumbnail shown before video plays
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaContentConfigForm;

