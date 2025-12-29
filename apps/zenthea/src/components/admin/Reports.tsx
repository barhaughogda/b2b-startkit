"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  FileText,
  Download,
  Calendar as CalendarIcon,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

type ReportType = "user_activity" | "compliance" | "financial" | "security";
type ExportFormat = "pdf" | "csv";

interface ReportData {
  type: ExportFormat;
  data: string;
  filename: string;
  generatedAt: number;
}

interface ReportResponse {
  success: boolean;
  data?: ReportData;
  error?: string;
  message?: string;
}

interface ReportsProps {
  className?: string;
}

/**
 * Reports Component
 * 
 * Component for generating and viewing reports with:
 * - Report type selection (user activity, compliance, financial, security)
 * - Date range selection (validates: future dates, max 1 year range)
 * - Export format selection (PDF, CSV)
 * - Report preview/display
 * - Export functionality
 * 
 * Features:
 * - Multiple report types
 * - Date range filtering with validation
 * - CSV export (fully functional)
 * - PDF export (currently returns JSON placeholder - see TODO in convex/admin/reports.ts)
 * - Report preview
 * - Comprehensive error handling
 * 
 * Note: PDF generation currently returns base64-encoded JSON data as a placeholder.
 * For production, proper PDF generation should be implemented using a PDF library.
 * 
 * @param className - Optional CSS class name for styling
 * 
 * @example
 * ```tsx
 * <Reports />
 * ```
 */
export function Reports({ className }: ReportsProps) {
  const [reportType, setReportType] = useState<ReportType>("user_activity");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("csv");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateDateRange = useCallback((): boolean => {
    if (startDate && endDate) {
      const start = startDate.getTime();
      const end = endDate.getTime();
      const now = Date.now();
      const maxRange = 365 * 24 * 60 * 60 * 1000; // 1 year in milliseconds
      
      if (isNaN(start) || isNaN(end)) {
        setError("Invalid date format");
        return false;
      }
      
      if (start > end) {
        setError("End date must be after start date");
        return false;
      }
      
      if (end > now) {
        setError("End date cannot be in the future");
        return false;
      }
      
      if (end - start > maxRange) {
        setError("Date range cannot exceed 1 year");
        return false;
      }
    }
    return true;
  }, [startDate, endDate]);

  const handleGenerateReport = useCallback(async () => {
    setError(null);
    
    if (!validateDateRange()) {
      return;
    }

    setIsLoading(true);

    try {
      const requestBody: {
        reportType: ReportType;
        exportFormat: ExportFormat;
        dateRange?: {
          startDate: string;
          endDate: string;
        };
      } = {
        reportType,
        exportFormat,
      };

      if (startDate && endDate) {
        requestBody.dateRange = {
          startDate: startDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        };
      }

      const response = await fetch("/api/admin/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const data: ReportResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to generate report");
      }

      if (data.data) {
        setReportData(data.data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to generate report";
      setError(errorMessage);
      setReportData(null);
    } finally {
      setIsLoading(false);
    }
  }, [reportType, exportFormat, startDate, endDate, validateDateRange]);

  const handleDownload = useCallback(() => {
    if (!reportData) return;

    try {
      // Decode base64 data if needed
      let blob: Blob;
      const mimeType = reportData.type === "pdf" ? "application/pdf" : "text/csv";

      if (reportData.type === "csv") {
        // CSV data might be plain text or base64
        try {
          // Try to decode as base64 first
          const decodedData = atob(reportData.data);
          blob = new Blob([decodedData], { type: mimeType });
        } catch {
          // If not base64, use as plain text
          blob = new Blob([reportData.data], { type: mimeType });
        }
      } else {
        // PDF is base64 encoded
        const decodedData = atob(reportData.data);
        const bytes = new Uint8Array(decodedData.length);
        for (let i = 0; i < decodedData.length; i++) {
          bytes[i] = decodedData.charCodeAt(i);
        }
        blob = new Blob([bytes], { type: mimeType });
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = reportData.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to download report");
    }
  }, [reportData]);

  const handleRetry = useCallback(() => {
    setError(null);
    handleGenerateReport();
  }, [handleGenerateReport]);

  return (
    <div className={className}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">Reports</h1>
        <p className="text-text-secondary mt-1">Generate and export reports</p>
      </div>

      {/* Report Configuration */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Report Configuration</CardTitle>
          <CardDescription>Select report type, date range, and export format</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Report Type Selection */}
            <div>
              <Label htmlFor="report-type">
                Report Type
              </Label>
              <Select
                value={reportType}
                onValueChange={(value) => setReportType(value as ReportType)}
              >
                <SelectTrigger id="report-type" className="mt-1" aria-label="Report Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user_activity">User Activity</SelectItem>
                  <SelectItem value="compliance">Compliance</SelectItem>
                  <SelectItem value="financial">Financial</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-date">
                  Start Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="start-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !startDate && "text-muted-foreground"
                      )}
                      aria-label="Start Date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP") : "Pick a start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      disabled={(date) => {
                        // Disable future dates
                        if (date > new Date()) return true;
                        // Disable dates after end date if end date is set
                        if (endDate && date > endDate) return true;
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <Label htmlFor="end-date">
                  End Date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      id="end-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal mt-1",
                        !endDate && "text-muted-foreground"
                      )}
                      aria-label="End Date"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP") : "Pick an end date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      disabled={(date) => {
                        // Disable future dates
                        if (date > new Date()) return true;
                        // Disable dates before start date if start date is set
                        if (startDate && date < startDate) return true;
                        return false;
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Export Format Selection */}
            <div>
              <Label htmlFor="export-format">
                Export Format
              </Label>
              <Select
                value={exportFormat}
                onValueChange={(value) => setExportFormat(value as ExportFormat)}
              >
                <SelectTrigger id="export-format" className="mt-1" aria-label="Export Format">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Generate Button */}
            <div>
              <Button
                onClick={handleGenerateReport}
                disabled={isLoading}
                className="w-full md:w-auto"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Report...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Report Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Report Preview</CardTitle>
          <CardDescription>Generated report preview and download</CardDescription>
        </CardHeader>
        <CardContent>
          {!reportData ? (
            <div className="text-center py-8 text-text-secondary">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No report generated yet</p>
              <p className="text-sm mt-2">Configure settings above and click &quot;Generate Report&quot;</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Report generated successfully
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-text-primary">Filename</p>
                    <p className="text-sm text-text-secondary">{reportData.filename}</p>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Format</p>
                    <p className="text-sm text-text-secondary uppercase">{reportData.type}</p>
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">Generated</p>
                    <p className="text-sm text-text-secondary">
                      {new Date(reportData.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-border-primary">
                  <Button onClick={handleDownload} className="w-full md:w-auto">
                    <Download className="h-4 w-4 mr-2" />
                    Download Report
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

