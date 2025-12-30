'use client';

import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { cropImage, type CropArea } from '@/lib/images/crop-image';
import { logger } from '@/lib/logger';

// =============================================================================
// TYPES
// =============================================================================

interface LogoCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

// Fixed 4:1 aspect ratio for website header logo
const LOGO_ASPECT_RATIO = 4 / 1;

// Output width for the cropped logo (maintains 4:1 aspect = 400x100)
const OUTPUT_WIDTH = 400;

// =============================================================================
// COMPONENT
// =============================================================================

export function LogoCropDialog({
  open,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: LogoCropDialogProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onCropChange = useCallback((location: Point) => {
    setCrop(location);
  }, []);

  const onZoomChange = useCallback((newZoom: number) => {
    setZoom(newZoom);
  }, []);

  const onCropAreaComplete = useCallback(
    (_croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const cropArea: CropArea = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      };

      const croppedBlob = await cropImage(
        imageSrc,
        cropArea,
        OUTPUT_WIDTH,
        'image/png'
      );

      onCropComplete(croppedBlob);
      onOpenChange(false);
    } catch (error) {
      logger.error('Failed to crop image:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [croppedAreaPixels, imageSrc, onCropComplete, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Reset state when dialog opens
  React.useEffect(() => {
    if (open) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Crop Website Logo</DialogTitle>
          <DialogDescription>
            Adjust the crop area to fit your logo. The logo will be displayed in
            the website header and footer with a 4:1 aspect ratio.
          </DialogDescription>
        </DialogHeader>

        {/* Cropper Container */}
        <div className="relative w-full h-[300px] bg-surface-secondary rounded-lg overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={LOGO_ASPECT_RATIO}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaComplete}
            showGrid
            style={{
              containerStyle: {
                width: '100%',
                height: '100%',
              },
            }}
          />
        </div>

        {/* Zoom Control */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <ZoomIn className="w-4 h-4" />
            Zoom
          </Label>
          <div className="flex items-center gap-4">
            <ZoomOut className="w-4 h-4 text-text-tertiary" />
            <Slider
              value={[zoom]}
              min={1}
              max={3}
              step={0.1}
              onValueChange={(values) => {
                const val = values[0];
                if (val !== undefined) {
                  setZoom(val);
                }
              }}
              className="flex-1"
            />
            <ZoomIn className="w-4 h-4 text-text-tertiary" />
          </div>
        </div>

        {/* Preview indicator */}
        <div className="text-sm text-text-secondary text-center">
          Output size: {OUTPUT_WIDTH} × {OUTPUT_WIDTH / LOGO_ASPECT_RATIO}px
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing || !croppedAreaPixels}
            className="bg-interactive-primary hover:bg-interactive-primary-hover"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Crop & Upload'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default LogoCropDialog;

