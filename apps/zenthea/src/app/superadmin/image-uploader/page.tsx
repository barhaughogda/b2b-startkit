"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { SuperAdminLayout } from "@/components/layouts/SuperAdminLayout";

interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export default function ImageUploaderPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current hero image URL from the page
  const getCurrentImageUrl = () => {
    // Return the current image URL if we have one, otherwise use a default
    return currentImageUrl || "https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg";
  };

  // Fetch current hero image on component mount
  React.useEffect(() => {
    const fetchCurrentImage = async () => {
      try {
        const response = await fetch('/api/set-hero-image');
        const data = await response.json();
        
        if (data.success && data.url) {
          setCurrentImageUrl(data.url);
        }
      } catch (error) {
        console.error('Failed to fetch current hero image:', error);
      }
    };

    fetchCurrentImage();
  }, []);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setResult({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed.'
        });
        return;
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        setResult({
          success: false,
          error: 'File too large. Maximum size is 10MB.'
        });
        return;
      }

      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const xhr = new XMLHttpRequest();
      
      // Track upload progress
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(progress);
        }
      });

      // Handle upload completion
      xhr.addEventListener('load', () => {
        setUploading(false);
        
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            if (response.success) {
              setResult({
                success: true,
                url: response.url,
                key: response.key
              });
              setCurrentImageUrl(response.url);
            } else {
              setResult({
                success: false,
                error: response.error || 'Upload failed'
              });
            }
          } catch (error) {
            setResult({
              success: false,
              error: 'Invalid response from server'
            });
          }
        } else {
          setResult({
            success: false,
            error: `Upload failed with status ${xhr.status}`
          });
        }
      });

      xhr.addEventListener('error', () => {
        setUploading(false);
        setResult({
          success: false,
          error: 'Network error during upload'
        });
      });

      xhr.open('POST', '/api/upload-hero-simple');
      xhr.send(formData);

    } catch (error) {
      setUploading(false);
      setResult({
        success: false,
        error: 'Upload failed due to an unexpected error'
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshCurrentImage = async () => {
    try {
      const response = await fetch('/api/set-hero-image');
      const data = await response.json();
      
      if (data.success && data.url) {
        setCurrentImageUrl(data.url);
      } else {
        // Fallback to default if no current image found
        setCurrentImageUrl("https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg");
      }
    } catch (error) {
      console.error('Failed to refresh current hero image:', error);
      // Fallback to default on error
      setCurrentImageUrl("https://dbbi79w6g08cf.cloudfront.net/images/hero/hero-medical-professional.jpg");
    }
  };

  const forceRefreshHeroImage = async () => {
    try {
      // Force refresh by opening the landing page in a new tab
      // This will trigger the HeroImage component to refetch
      const landingPageUrl = window.location.origin;
      window.open(landingPageUrl, '_blank');
    } catch (error) {
      console.error('Failed to refresh hero image:', error);
    }
  };

  // Update current image URL when a new upload succeeds
  React.useEffect(() => {
    if (result?.success && result.url) {
      setCurrentImageUrl(result.url);
    }
  }, [result]);

  return (
    <SuperAdminLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Hero Image Uploader
          </h1>
          <p className="text-text-secondary">
            Upload and manage the hero image for your landing page
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Image
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Input */}
              <div>
                <Label htmlFor="file-upload">Select Image File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handleFileSelect}
                  ref={fileInputRef}
                  className="mt-2"
                />
                <p className="text-sm text-text-tertiary mt-1">
                  Supported formats: JPEG, PNG, WebP (Max 10MB)
                </p>
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <div className="p-4 bg-background-secondary rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <ImageIcon className="h-4 w-4 text-zenthea-teal" />
                    <span className="font-medium">{selectedFile.name}</span>
                  </div>
                  <p className="text-sm text-text-secondary">
                    Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              )}

              {/* Upload Progress */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Uploading...</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-sm text-text-secondary text-center">
                    {uploadProgress}%
                  </p>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full bg-zenthea-teal hover:bg-zenthea-teal-600"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Image
                  </>
                )}
              </Button>

              {/* Result Messages */}
              {result && (
                <Alert className={result.success ? "border-border-success bg-background-secondary" : "border-border-error bg-background-secondary"}>
                  <div className="flex items-center gap-2">
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-status-success" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-status-error" />
                    )}
                    <AlertDescription className={result.success ? "text-status-success" : "text-status-error"}>
                      {result.success ? "Image uploaded successfully!" : result.error}
                    </AlertDescription>
                  </div>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Current Image Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Current Hero Image
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={refreshCurrentImage}
                  className="ml-auto"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Preview */}
              <div className="relative bg-background-secondary rounded-lg overflow-hidden">
                <img
                  src={currentImageUrl || getCurrentImageUrl()}
                  alt="Current hero image"
                  className="w-full h-64 object-cover"
                  onError={(e) => {
                    e.currentTarget.src = '/images/placeholder-hero.svg';
                  }}
                />
              </div>

              {/* Image URL */}
              {result?.success && result.url && (
                <div className="space-y-2">
                  <Label>New Image URL:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={result.url}
                      readOnly
                      className="text-sm font-mono"
                      style={{ minWidth: '400px' }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(result.url!)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(result.url, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual Hero Image Override */}
              {result?.success && result.url && (
                <div className="p-4 bg-background-secondary rounded-lg border border-border-success">
                  <h4 className="font-medium text-status-success mb-2">Set as Hero Image:</h4>
                  <p className="text-sm text-text-primary mb-3">
                    Your image was uploaded successfully. Click below to set it as the hero image on the landing page.
                  </p>
                  <Button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/manual-hero-image', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ url: result.url })
                        });
                        if (response.ok) {
                          alert('Hero image set successfully! The landing page should now show your new image.');
                        } else {
                          alert('Failed to set hero image. Please try again.');
                        }
                      } catch (error) {
                        alert('Error setting hero image. Please try again.');
                      }
                    }}
                    className="w-full bg-status-success hover:bg-interactive-primary-hover text-text-inverse"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Set as Hero Image Now
                  </Button>
                </div>
              )}

              {/* Force Refresh Button */}
              <div className="p-4 bg-background-secondary rounded-lg border border-border-warning">
                <h4 className="font-medium text-status-warning mb-2">Hero Image Update:</h4>
                <p className="text-sm text-text-primary mb-3">
                  If your new image doesn&apos;t appear on the landing page immediately, 
                  it may take a few minutes due to S3 eventual consistency.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={forceRefreshHeroImage}
                  className="w-full"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Force Refresh Landing Page
                </Button>
              </div>

              {/* Instructions */}
              <div className="p-4 bg-background-secondary rounded-lg border border-border-primary">
                <h4 className="font-medium text-status-info mb-2">Next Steps:</h4>
                <ol className="text-sm text-text-primary space-y-1">
                  <li>1. Upload your new image using the form</li>
                  <li>2. Copy the generated URL</li>
                  <li>3. Wait 2-3 minutes for S3 consistency</li>
                  <li>4. Use &quot;Force Refresh&quot; button if needed</li>
                  <li>5. Test the landing page to see your new image</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => window.open('/', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Landing Page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => window.open('/auth/signin', '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Login Page
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </SuperAdminLayout>
  );
}