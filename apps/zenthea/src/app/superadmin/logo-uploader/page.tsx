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

export default function LogoUploaderPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [currentLogoUrl, setCurrentLogoUrl] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current logo URL from the page
  const getCurrentLogoUrl = () => {
    // Return the current logo URL if we have one, otherwise use a default
    return currentLogoUrl || "https://dbbi79w6g08cf.cloudfront.net/images/logo/zenthea-logo.png";
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
        return;
      }

      // Validate file size (max 5MB for logos)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        alert('File too large. Maximum size is 5MB.');
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

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload-logo', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const data = await response.json();

      if (data.success) {
        setResult({
          success: true,
          url: data.url,
          key: data.key,
        });
        setCurrentLogoUrl(data.url);
        
        // Automatically persist the logo (without showing alert)
        await setAsLogo(data.url, false);
      } else {
        setResult({
          success: false,
          error: data.error || 'Upload failed',
        });
      }
    } catch (error) {
      setResult({
        success: false,
        error: 'Upload failed with status 500',
      });
    } finally {
      setUploading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const refreshCurrentLogo = () => {
    setCurrentLogoUrl(getCurrentLogoUrl());
  };

  const setAsLogo = async (url: string | undefined, showAlert = true) => {
    if (!url) {
      if (showAlert) alert('No logo URL available. Please try uploading again.');
      return;
    }
    
    try {
      const response = await fetch('/api/manual-logo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        if (showAlert) alert('Logo set successfully! The landing page should now show your new logo.');
        setCurrentLogoUrl(url);
      } else {
        const errorData = await response.json();
        if (showAlert) alert(`Failed to set logo: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error setting logo:', error);
      if (showAlert) alert('Error setting logo. Please try again.');
    }
  };

  // Update current logo URL when a new upload succeeds
  React.useEffect(() => {
    if (result?.success && result.url) {
      setCurrentLogoUrl(result.url);
    }
  }, [result]);

  return (
    <SuperAdminLayout>
      <div className="max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Logo Uploader
          </h1>
          <p className="text-text-secondary">
            Upload and manage the logo for your landing page
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload New Logo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Selection */}
              <div className="space-y-2">
                <Label htmlFor="file">Select Logo File</Label>
                <div className="flex items-center gap-2">
                  <Input
                    ref={fileInputRef}
                    id="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileSelect}
                    className="flex-1"
                  />
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                    Choose file
                  </Button>
                </div>
                <p className="text-sm text-text-tertiary">
                  Supported formats: JPEG, PNG, WebP (Max 5MB)
                </p>
              </div>

              {/* Selected File Info */}
              {selectedFile && (
                <div className="flex items-center gap-3 p-3 bg-background-secondary rounded-lg">
                  <ImageIcon className="h-5 w-5 text-zenthea-teal" />
                  <div className="flex-1">
                    <p className="font-medium text-text-primary">{selectedFile.name}</p>
                    <p className="text-sm text-text-secondary">
                      Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full"
                size="lg"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>

              {/* Progress Bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Result Messages */}
              {result && (
                <Alert className={result.success ? "border-border-success bg-background-secondary" : "border-border-error bg-background-secondary"}>
                  {result.success ? (
                    <CheckCircle className="h-4 w-4 text-status-success" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-status-error" />
                  )}
                  <AlertDescription className={result.success ? "text-status-success" : "text-status-error"}>
                    {result.success ? "Logo uploaded successfully!" : result.error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Manual Logo Override */}
              {result?.success && result.url && (
                <div className="p-4 bg-background-secondary rounded-lg border border-border-success">
                  <h4 className="font-medium text-status-success mb-2">Set as Logo:</h4>
                  <p className="text-sm text-text-primary mb-3">
                    Your logo was uploaded successfully. Click below to set it as the logo on the landing page.
                  </p>
                  <Button
                    onClick={() => setAsLogo(result.url)}
                    className="w-full bg-status-success hover:bg-interactive-primary-hover text-text-inverse"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Set as Logo Now
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Current Logo Preview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Current Logo
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={refreshCurrentLogo}
                    className="ml-auto"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative bg-background-secondary rounded-lg overflow-hidden">
                  <img
                    src={currentLogoUrl || getCurrentLogoUrl()}
                    alt="Current logo"
                    className="w-full h-32 object-contain p-4"
                    onError={(e) => {
                      e.currentTarget.src = '/images/placeholder-hero.svg';
                    }}
                  />
                </div>
                
                {/* Logo URL */}
                {result?.success && result.url && (
                  <div className="mt-4 space-y-2">
                    <Label>New Logo URL:</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={result.url}
                        readOnly
                        className="flex-1 text-sm"
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
              </CardContent>
            </Card>

            {/* Next Steps */}
            <Card>
              <CardHeader>
                <CardTitle>Next Steps:</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>1. Upload your new logo using the form</p>
                <p>2. Copy the generated URL</p>
                <p>3. The page.tsx file will be automatically updated</p>
                <p>4. Test the landing page to see your new logo</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 flex gap-4">
          <Button variant="outline" asChild>
            <Link href="/" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Landing Page
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/login" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Login Page
            </Link>
          </Button>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
