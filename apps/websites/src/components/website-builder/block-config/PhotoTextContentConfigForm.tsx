'use client';

/**
 * Photo + Text Content Config Form
 * 
 * Configuration panel for editing Photo + Text block content in the Website Builder sidebar.
 * Allows configuring image, text content, and layout options.
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImageUpload } from '../ImageUpload';

// =============================================================================
// TYPES
// =============================================================================

interface PhotoTextContentConfigFormProps {
  props: Record<string, unknown>;
  onUpdate: (props: Record<string, unknown>) => void;
  disabled?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function PhotoTextContentConfigForm({
  props,
  onUpdate,
  disabled,
}: PhotoTextContentConfigFormProps) {
  const imageUrl = (props.imageUrl as string) || '';
  const imageAlt = (props.imageAlt as string) || '';
  const imageAspect = (props.imageAspect as string) || 'square';
  const imagePosition = (props.imagePosition as string) || 'left';
  const header = (props.header as string) || '';
  const tagline = (props.tagline as string) || '';
  const body = (props.body as string) || '';

  return (
    <div className="space-y-6">
      {/* Image Section */}
      <div className="space-y-4">
        <h4 className="font-medium text-sm text-text-primary">Image</h4>
        
        {/* Image Upload */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-image">Photo</Label>
          <ImageUpload
            value={imageUrl}
            onChange={(url) => onUpdate({ ...props, imageUrl: url })}
            disabled={disabled}
            aspectRatio={
              imageAspect === 'square'
                ? 'square'
                : imageAspect === 'portrait-3-4'
                  ? 'portrait'
                  : 'portrait-9-16'
            }
            imageType="block"
          />
        </div>

        {/* Image Alt Text */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-alt">Alt Text</Label>
          <Input
            id="photo-text-alt"
            value={imageAlt}
            onChange={(e) => onUpdate({ ...props, imageAlt: e.target.value || undefined })}
            disabled={disabled}
            placeholder="Describe the image for accessibility"
          />
        </div>

        {/* Image Aspect Ratio */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-aspect">Aspect Ratio</Label>
          <Select
            value={imageAspect}
            onValueChange={(value) => onUpdate({ ...props, imageAspect: value })}
            disabled={disabled}
          >
            <SelectTrigger id="photo-text-aspect">
              <SelectValue placeholder="Select aspect ratio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="square">Square (1:1)</SelectItem>
              <SelectItem value="portrait-3-4">Portrait (3:4)</SelectItem>
              <SelectItem value="portrait-9-16">Portrait (9:16)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Image Position */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-position">Image Position</Label>
          <Select
            value={imagePosition}
            onValueChange={(value) => onUpdate({ ...props, imagePosition: value })}
            disabled={disabled}
          >
            <SelectTrigger id="photo-text-position">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-text-tertiary">
            On mobile, image always appears above text
          </p>
        </div>
      </div>

      {/* Text Content Section */}
      <div className="space-y-4 border-t border-border-primary pt-6">
        <h4 className="font-medium text-sm text-text-primary">Text Content</h4>

        {/* Header */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-header">Header</Label>
          <Input
            id="photo-text-header"
            value={header}
            onChange={(e) => onUpdate({ ...props, header: e.target.value || undefined })}
            disabled={disabled}
            placeholder="Enter a headline"
          />
        </div>

        {/* Tagline */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-tagline">Tagline</Label>
          <Input
            id="photo-text-tagline"
            value={tagline}
            onChange={(e) => onUpdate({ ...props, tagline: e.target.value || undefined })}
            disabled={disabled}
            placeholder="Enter a tagline or subtitle"
          />
        </div>

        {/* Body Text */}
        <div className="space-y-2">
          <Label htmlFor="photo-text-body">Body Text</Label>
          <Textarea
            id="photo-text-body"
            value={body}
            onChange={(e) => onUpdate({ ...props, body: e.target.value || undefined })}
            disabled={disabled}
            placeholder="Enter the main content text"
            rows={6}
          />
          <p className="text-xs text-text-tertiary">
            Separate paragraphs with a blank line
          </p>
        </div>
      </div>
    </div>
  );
}

export default PhotoTextContentConfigForm;

