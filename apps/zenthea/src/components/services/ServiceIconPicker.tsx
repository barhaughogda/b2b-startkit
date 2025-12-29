'use client';

import React, { useState, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Upload, Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import {
  getLucideIcon,
  ICON_CATEGORIES,
  type ServiceIcon,
} from '@/lib/services/icons';
import {
  MAX_SERVICE_ICON_SIZE,
  ALLOWED_SERVICE_ICON_TYPES,
} from '@/lib/service-icon-constants';

interface ServiceIconPickerProps {
  value?: ServiceIcon;
  onChange: (icon: ServiceIcon | undefined) => void;
  tenantId?: string;
}

export function ServiceIconPicker({
  value,
  onChange,
  tenantId,
}: ServiceIconPickerProps) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection and upload
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!ALLOWED_SERVICE_ICON_TYPES.includes(file.type as typeof ALLOWED_SERVICE_ICON_TYPES[number])) {
      toast.error('Invalid file type. Only SVG files are allowed.');
      return;
    }

    // Validate file size
    if (file.size > MAX_SERVICE_ICON_SIZE) {
      toast.error(`File too large. Maximum size is ${MAX_SERVICE_ICON_SIZE / 1024}KB.`);
      return;
    }

    // Use tenantId from props or session
    const uploadTenantId = tenantId || session?.user?.tenantId;
    if (!uploadTenantId) {
      toast.error('Unable to upload: no tenant ID available.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenantId', uploadTenantId);

      const response = await fetch('/api/upload-service-icon', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Update the icon with the uploaded URL
      onChange({ kind: 'customSvg', url: data.url });
      setOpen(false);
      toast.success('Icon uploaded successfully');
    } catch (error) {
      logger.error('Service icon upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload icon');
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Render the current icon preview
  const renderIconPreview = () => {
    if (!value) {
      const DefaultIcon = Calendar;
      return <DefaultIcon className="h-6 w-6 text-text-tertiary" />;
    }

    if (value.kind === 'lucide') {
      const IconComponent = getLucideIcon(value.name);
      if (IconComponent) {
        return <IconComponent className="h-6 w-6 text-zenthea-teal" />;
      }
    }

    if (value.kind === 'customSvg') {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={value.url}
          alt="Custom icon"
          className="h-6 w-6 object-contain"
        />
      );
    }

    return <Calendar className="h-6 w-6 text-text-tertiary" />;
  };

  // Filter icons by search query
  const filterIcons = (icons: readonly string[]) => {
    if (!searchQuery) return icons;
    return icons.filter((name) =>
      name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const handleSelectIcon = (iconName: string) => {
    onChange({ kind: 'lucide', name: iconName });
    setOpen(false);
  };

  const handleClearIcon = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          type="button"
          className="w-full justify-start h-auto py-3"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-secondary rounded-lg">
              {renderIconPreview()}
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">
                {value?.kind === 'lucide' ? value.name : 
                 value?.kind === 'customSvg' ? 'Custom Icon' : 
                 'Choose an icon'}
              </p>
              <p className="text-xs text-text-tertiary">Click to change</p>
            </div>
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        {/* Hidden file input for upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".svg,image/svg+xml"
          onChange={handleFileSelect}
          className="hidden"
        />

        <Tabs defaultValue="curated" className="w-full">
          <TabsList className="w-full grid grid-cols-2 m-0 rounded-none border-b">
            <TabsTrigger value="curated">Curated Icons</TabsTrigger>
            <TabsTrigger value="custom">
              Custom
            </TabsTrigger>
          </TabsList>

          <TabsContent value="curated" className="m-0">
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-text-tertiary" />
                <Input
                  placeholder="Search icons..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <ScrollArea className="h-64">
              <div className="p-3 space-y-4">
                {Object.entries(ICON_CATEGORIES).map(([category, icons]) => {
                  const filteredIcons = filterIcons(icons);
                  if (filteredIcons.length === 0) return null;

                  return (
                    <div key={category}>
                      <Label className="text-xs text-text-tertiary uppercase tracking-wider">
                        {category}
                      </Label>
                      <div className="grid grid-cols-6 gap-1 mt-2">
                        {filteredIcons.map((iconName) => {
                          const IconComponent = getLucideIcon(iconName);
                          if (!IconComponent) return null;

                          const isSelected =
                            value?.kind === 'lucide' && value.name === iconName;

                          return (
                            <button
                              key={iconName}
                              type="button"
                              onClick={() => handleSelectIcon(iconName)}
                              className={`p-2 rounded-md transition-colors ${
                                isSelected
                                  ? 'bg-zenthea-teal/20 text-zenthea-teal ring-1 ring-zenthea-teal'
                                  : 'hover:bg-surface-elevated text-text-secondary hover:text-text-primary'
                              }`}
                              title={iconName}
                            >
                              <IconComponent className="h-5 w-5" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>

            <div className="p-3 border-t">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearIcon}
                className="w-full text-text-secondary"
              >
                Use default icon
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="custom" className="m-0 p-4">
            {value?.kind === 'customSvg' ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center p-4 bg-surface-secondary rounded-lg">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={value.url}
                    alt="Custom icon"
                    className="h-12 w-12 object-contain"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    {isUploading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    Replace
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClearIcon}
                    disabled={isUploading}
                    className="flex-1"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Upload className="h-8 w-8 mx-auto text-text-tertiary mb-2" />
                <p className="text-sm text-text-secondary mb-2">
                  Upload a custom SVG icon
                </p>
                <p className="text-xs text-text-tertiary mb-4">
                  Max {MAX_SERVICE_ICON_SIZE / 1024}KB • SVG only
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleUploadClick}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  {isUploading ? 'Uploading...' : 'Choose SVG'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}

