"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Pen, X, Check } from "lucide-react";
import { DigitalSignature as DigitalSignatureType } from "@/types";

interface DigitalSignatureProps {
  requestId: string;
  purpose: string;
  superadminName?: string;
  targetTenantId: string;
  targetUserId?: string;
  onSignatureComplete: (signature: DigitalSignatureType) => void;
  onCancel: () => void;
  expirationTimestamp?: number; // When the access will expire (1 hour after approval)
}

export function DigitalSignature({
  requestId,
  purpose,
  superadminName,
  targetTenantId,
  targetUserId,
  onSignatureComplete,
  onCancel,
  expirationTimestamp,
}: DigitalSignatureProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

  // Consent text that will be stored with the signature
  const consentText = `I consent to granting support access to ${superadminName || "a superadmin"} for the following purpose: ${purpose}. I understand that:
- This access is limited to 1 hour
- All access will be logged for audit purposes
- I can revoke access at any time
- This access is for support purposes only`;

  // Timer for expiration countdown
  useEffect(() => {
    if (!expirationTimestamp) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, expirationTimestamp - now);
      setTimeRemaining(remaining);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [expirationTimestamp]);

  // Format time remaining as MM:SS
  const formatTimeRemaining = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    // Set drawing style
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  // Get coordinates relative to canvas
  const getCoordinates = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const clientX =
      "touches" in e ? e.touches[0]?.clientX : e.clientX;
    const clientY =
      "touches" in e ? e.touches[0]?.clientY : e.clientY;

    if (clientX === undefined || clientY === undefined) return null;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
  };

  // Start drawing
  const startDrawing = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      e.preventDefault();
      const coords = getCoordinates(e);
      if (!coords) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      setIsDrawing(true);
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
    },
    []
  );

  // Draw
  const draw = useCallback(
    (
      e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
    ) => {
      if (!isDrawing) return;
      e.preventDefault();

      const coords = getCoordinates(e);
      if (!coords) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
      setHasSignature(true);
    },
    [isDrawing]
  );

  // Stop drawing
  const stopDrawing = useCallback(() => {
    setIsDrawing(false);
  }, []);

  // Clear signature
  const clearSignature = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    setError(null);
  }, []);

  // Convert canvas to base64
  const getSignatureData = useCallback((): string | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    // Check if canvas is empty
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = imageData.data.every((pixel) => pixel === 0);

    if (isEmpty) return null;

    return canvas.toDataURL("image/png");
  }, []);

  // Submit signature
  const handleSubmit = useCallback(async () => {
    if (!hasSignature) {
      setError("Please provide your signature before submitting");
      return;
    }

    const signatureData = getSignatureData();
    if (!signatureData) {
      setError("Signature is empty. Please sign the canvas.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get IP address and user agent
      const ipAddress = await fetch("https://api.ipify.org?format=json")
        .then((res) => res.json())
        .then((data) => data.ip)
        .catch(() => undefined);

      const userAgent = navigator.userAgent;

      const signature: DigitalSignatureType = {
        signatureData: signatureData,
        signedAt: Date.now(),
        ipAddress,
        userAgent,
        consentText,
      };

      // Call API to approve the request
      const response = await fetch(
        `/api/superadmin/support-access/${requestId}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            digitalSignature: signature,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || data.error || "Failed to approve request"
        );
      }

      // Call the callback with the signature and expiration timestamp
      onSignatureComplete(signature);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process signature. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [
    hasSignature,
    getSignatureData,
    consentText,
    requestId,
    onSignatureComplete,
  ]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pen className="h-5 w-5" />
          Digital Signature Consent
        </CardTitle>
        <CardDescription>
          Please review the consent information and provide your digital signature
          to approve the support access request.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Consent Text */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-text-primary">
            Consent Information
          </h3>
          <div className="p-4 bg-background-secondary rounded-md border border-border-primary">
            <p className="text-sm text-text-secondary whitespace-pre-wrap">
              {consentText}
            </p>
          </div>
        </div>

        {/* Expiration Timer */}
        {timeRemaining !== null && timeRemaining > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <AlertCircle className="h-4 w-4 text-blue-800" />
            <AlertDescription className="text-blue-800">
              Access will expire in:{" "}
              <span className="font-mono font-semibold">
                {formatTimeRemaining(timeRemaining)}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Signature Canvas */}
        <div className="space-y-2">
          <label className="text-sm font-semibold text-text-primary">
            Your Signature <span className="text-status-error">*</span>
          </label>
          <div className="border-2 border-border-primary rounded-md bg-white relative">
            <canvas
              ref={canvasRef}
              className="w-full h-48 cursor-crosshair touch-none"
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            {!hasSignature && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-text-tertiary text-sm">
                  Sign here using your mouse or touch screen
                </p>
              </div>
            )}
          </div>
          {hasSignature && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="w-full sm:w-auto"
            >
              <X className="h-4 w-4 mr-2" />
              Clear Signature
            </Button>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!hasSignature || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Approve & Sign
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

