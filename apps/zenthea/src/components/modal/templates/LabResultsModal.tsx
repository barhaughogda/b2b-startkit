import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface LabResultsModalProps {
  patientName: string;
  providerName: string;
  onClose?: () => void;
}

export const LabResultsModal: React.FC<LabResultsModalProps> = ({
  patientName,
  providerName,
  onClose
}) => {
  const labResults = [
    { test: 'Hemoglobin', value: '14.2 g/dL', range: '12.0-15.5', status: 'normal' },
    { test: 'White Blood Cells', value: '8.5 K/μL', range: '4.5-11.0', status: 'normal' },
    { test: 'Glucose', value: '95 mg/dL', range: '70-100', status: 'normal' },
    { test: 'Cholesterol', value: '220 mg/dL', range: '<200', status: 'high' },
    { test: 'Creatinine', value: '1.8 mg/dL', range: '0.6-1.2', status: 'high' }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'high':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'low':
        return <TrendingDown className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'high':
        return <Badge variant="destructive">High</Badge>;
      case 'low':
        return <Badge variant="secondary">Low</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Lab Results</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{patientName}</Badge>
            <Badge variant="outline">{providerName}</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Test Results</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Test</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Reference Range</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Trend</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {labResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{result.test}</TableCell>
                  <TableCell>{result.value}</TableCell>
                  <TableCell>{result.range}</TableCell>
                  <TableCell>{getStatusBadge(result.status)}</TableCell>
                  <TableCell>{getStatusIcon(result.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button>Export Results</Button>
        </div>
      </CardContent>
    </Card>
  );
};